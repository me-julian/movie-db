'use strict'

function viewMovieDetails(API, target) {
    let collapseEl = document.querySelector('#info-collapse')
    if ($(collapseEl).hasClass('show')) {
        $(collapseEl).collapse('hide')
    }

    let movieId = $(target).attr('data-id')
    const movieDetailsRequest = retrieveMovieDetails(API, movieId)
    movieDetailsRequest.done((data) => {
        const detailsLoaded = populateMovieDetails(data)
        detailsLoaded.done(() => {
            // Need event listener/timeout to only do this after
            // it's disappeared.
            $(collapseEl).collapse('show')
        })
    })
}

function retrieveMovieDetails(API, movieId) {
    const request = $.Deferred()

    $.get({
        url: `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API.key}&language=en-US&append_to_response=credits,reviews`,
        success: (data) => {
            console.log(data)
            request.resolve(data)
        },
    }).fail(() => {
        console.error('Failed to retrieve movie details.')
        request.reject()
    })

    return request.promise()
}

function retrieveReviewsPage(API) {
    const request = $.Deferred()

    const page = $('#reviews nav .page-set.active').attr('data-page')
    const movieId = $('#movie-details').attr('data-movie-id')
    $.get({
        url: `https://api.themoviedb.org/3/movie/${movieId}/reviews?api_key=${
            API.key
        }&language=en-US&page=${parseInt(page) + 1}`,
        success: (data) => {
            request.resolve(data)
        },
    }).fail(() => {
        console.error('Failed to retrieve next page of reviews.')
        request.reject()
    })

    return request.promise()
}

function populateMovieDetails(movie) {
    const completed = $.Deferred()

    $('#movie-details').attr('data-movie-id', movie.id).removeClass('hidden')

    $('#title').text(movie.title)
    if (
        movie.original_language !== 'en' &&
        movie.title.toLowerCase() !== movie.original_title.toLowerCase()
    ) {
        $('#original-title').text(movie.original_title)
    } else {
        $('#original-title').text('')
    }

    $('#poster').attr(
        'src',
        `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    )

    if (movie.status === 'Released') {
        $('#release-date').text(movie.release_date.slice(0, 4))
        $('#rating').text(movie.vote_average.toFixed(1))
    } else {
        $('#release-date').text(`Coming ${movie.release_date.slice(0, 4)}`)
        $('#rating-wrapper').addClass('hidden')
    }
    $('#overview').text(movie.overview)

    populateMovieDetailsMisc(movie)

    populateMovieDetailsCast(movie)

    populateMovieDetailsReviews(movie)

    completed.resolve()
    return completed.promise()
}
function populateMovieDetailsMisc(movie) {
    if (movie.genres.length > 0) {
        let genreString = movie.genres[0].name
        for (let i = 1; i < movie.genres.length; i++) {
            genreString = genreString.concat(', ', movie.genres[i].name)
        }
        $('#genres').text(`Genres: ${genreString}`)
    } else {
        hideInfo($('#genres'))
    }
    if (movie.runtime !== 0) {
        $('#runtime').text(`Runtime: ${movie.runtime} minutes`)
    } else {
        hideInfo($('#runtime'))
    }
    if (movie.production_countries.length > 0) {
        let countriesString = movie.production_countries[0].name
        for (let i = 1; i < movie.production_countries.length; i++) {
            countriesString = countriesString.concat(
                ', ',
                movie.production_countries[i].name
            )
        }
        $('#production-countries').text(`Produced in: ${countriesString}`)
    } else {
        hideInfo($('#production-countries'))
    }
    if (movie.spoken_languages.length > 0) {
        let languagesString = movie.spoken_languages[0].english_name
        for (let i = 1; i < movie.spoken_languages.length; i++) {
            languagesString = languagesString.concat(
                ', ',
                movie.spoken_languages[i].english_name
            )
        }
        $('#spoken-languages').text(`Languages: ${languagesString}`)
    } else {
        hideInfo($('#spoken-languages'))
    }
    if (movie.budget !== 0) {
        $('#budget').text(`Budget: $${movie.budget.toLocaleString()}`)
    } else {
        hideInfo($('#budget'))
    }
    if (movie.revenue !== 0) {
        $('#revenue').text(`Revenue: $${movie.revenue.toLocaleString()}`)
    } else {
        hideInfo($('#revenue'))
    }
}

function populateMovieDetailsCast(movie) {
    const container = $('#movie-credits')
    const cast = movie.credits.cast.sort(sortCastOrder)
    for (let credit of cast) {
        container.append(
            $(document.createElement('li'))
                .addClass('d-flex align-items-center cast-credit')
                .attr('data-actor-id', credit.id)
                .html(getCastCreditString(credit))
        )
    }
}
function sortCastOrder(a, b) {
    let orderDiff = a.order - b.order
    if (orderDiff === 0) {
        return a.popularity - b.popularity
    } else {
        return orderDiff
    }
}
function getCastCreditString(credit) {
    let charStr
    if (credit.character) {
        charStr = credit.character
    } else {
        charStr = 'Unnamed'
    }
    const character = `<p class="my-0">${charStr}</p>`
    const actor = `<p class="my-0 ms-auto justify-self-end">${credit.name}</p>`
    return character + actor
}

function populateMovieDetailsReviews(movie) {
    if (movie.reviews.results.length === 0) {
        $('#no-reviews').removeClass('hidden')
    } else {
        if ($('#current-review').children().length > 0) {
            updateReviewElement(movie.reviews.results[0])
        } else {
            let review = createReviewElement(movie.reviews.results[0])
            $('#current-review').append(review)
        }
    }

    initReviewPagination(movie.reviews)
}

function createReviewElement(review) {
    let card = $(document.createElement('div')).addClass('card')
    $(card).attr('data-review-id', review.id)
    $(card).attr('data-author-username', review.author_details.username)

    let cardBody = $(document.createElement('div')).addClass('card-body')

    // Currently scrolling as default, fairly small.
    // Probably would be nicer to shorten and add a 'read more'
    // with a simple modal screen.
    let body = $(document.createElement('p'))
        .addClass('card-text overflow-auto')
        .append(formatReviewContent(review.content))

    let info = $(document.createElement('div')).addClass('review-info')

    let infoText = $(document.createElement('div'))
    let author = $(document.createElement('h5'))
        .addClass('card-title fw-normal')
        .text(getAuthorAndRatingString(review))

    let creationDate = new Date(review.created_at)
    let date = $(document.createElement('h6'))
        .addClass('card-subtitle fw-normal')
        .text(creationDate.toLocaleString())

    infoText.append(author, date)

    if (review.author_details.avatar_path) {
        let avatar = getReviewAvatar(review)
        info.append(avatar)
    } else {
        $('.avatar').remove()
    }

    info.append(infoText)
    card.append(cardBody.append(body, info))
    return card
}

function updateReviewElement(review) {
    let card = $('#current-review').children().first()

    $(card).attr('data-review-id', review.id)
    $(card).attr('data-author-username', review.author_details.username)

    $(card).find('.card-text').children().remove()
    $(card).find('.card-text').append(formatReviewContent(review.content))

    if (review.author_details.avatar_path) {
        $(card)
            .find('.avatar')
            .first()
            .css('background-image', `url(${getReviewAvatarPath(review)})`)
            .removeClass('hidden')
    } else {
        hideInfo($(card).find('.avatar').first())
    }

    $(card).find('.card-title').first().text(getAuthorAndRatingString(review))

    let creationDate = new Date(review.created_at)
    $(card).find('.card-subtitle').first().text(creationDate.toLocaleString())
}

function getReviewAvatar(review) {
    let img = $(document.createElement('div')).addClass(
        'avatar rounded-circle m-1'
    )
    $(img).css('background-image', `url(${getReviewAvatarPath(review)})`)

    return img
}
function getReviewAvatarPath(review) {
    if (!review.author_details.avatar_path) {
        return null
    }

    let avatarPath
    if (review.author_details.avatar_path.includes('gravatar')) {
        avatarPath = review.author_details.avatar_path
        if (avatarPath.startsWith('/')) {
            avatarPath = avatarPath.slice(1, avatarPath.length)
        }
    } else {
        avatarPath = `https://image.tmdb.org/t/p/w500${review.author_details.avatar_path}`
    }
    return avatarPath
}

function getAuthorAndRatingString(review) {
    if (review.author_details.rating) {
        return `Rated ${review.author_details.rating} by ${review.author}`
    } else {
        return `${review.author}`
    }
}

function formatReviewContent(content) {
    let contents = content.split(/(?:\r\n|\r|\n)/g)
    return contents
        .map((v) => {
            if (v) {
                return `<p>${v}</p>`
            } else {
                return '<br>'
            }
        })
        .join('')
}

function initReviewPagination(reviews) {
    $('#reviews nav').attr('data-page', '1')
    if (reviews.results.length > 0) {
        populateReviewPagination(reviews, 1)
    } else {
        hideInfo($('#reviews nav'))
    }
}
function populateReviewPagination(reviews, reviewNum) {
    for (let sets = 0; sets < reviews.results.length / 10; sets++) {
        let set = $(document.createElement('div'))
            .addClass('pagination pagination-sm page-set')
            .attr('data-page', reviews.page)
            .insertBefore('#review-next')
        let i
        if (sets === 0) {
            i = 0
        } else {
            i = 10
        }
        for (
            i;
            $(set).children().length < 10 && i < reviews.results.length;
            i++
        ) {
            createPageLink(reviewNum, reviews.results[i], set)
            reviewNum++
        }
    }

    $('#reviews nav .page-set').each(function (i, el) {
        setPageContinuation(el, reviews)
    })

    if (!$('#reviews nav .page-set.active').length) {
        // Select first set and hide a potential second set.
        $('#reviews nav .page-set').first().addClass('active')
        // Select first review.
        $('#reviews nav .page-set.active .index').first().addClass('active')
    } else {
        // If adding new sew sets, switch from current to one
        // just created
        switchToExistingPageSet(
            $('#reviews nav .page-set.active').next('.page-set')
        )
    }

    checkNextBtnStatus()
    checkPrevBtnStatus()
}

function createPageLink(num, review, wrapper) {
    let li = $(document.createElement('li')).addClass('page-item index')
    li.append(
        $(document.createElement('a'))
            .addClass('page-link user-select-none')
            .text(num)
    )

    // Attach review data to HTML object for easy retrieval later.
    li[0].reviewData = review

    wrapper.append(li)
}

function setPageContinuation(set, reviews) {
    if (
        reviews.total_pages > parseInt($(set).attr('data-page')) ||
        $(set).next('.page-set').length
    ) {
        $(set).children().last().attr('data-continue', 'true')
    }
    if ($(set).prev('.page-set').length > 0) {
        $(set).children().first().attr('data-continue', 'true')
    }
}
function incrementReview(btn) {
    let li, newSet
    if (btn.id === 'review-prev') {
        li = $('#reviews nav .page-item.active').prev('.index')
        newSet = $('#reviews nav .page-set.active').prev('.page-set')
    } else if (btn.id === 'review-next') {
        li = $('#reviews nav .page-item.active').next('.index')
        newSet = $('#reviews nav .page-set.active').next('.page-set')
    } else {
        console.error('Unexpected event target incrementing viewed review.')
    }
    if (li[0]) {
        changeReviewPage(li[0])
    } else {
        changeReviewPageSet(newSet)
    }
}
function changeReviewPageSet(newSet) {
    if (newSet[0]) {
        switchToExistingPageSet(newSet)
    } else {
        loadNewReviews()
    }
}
function switchToExistingPageSet(newSet) {
    let initialReview

    if (
        !$('#reviews nav .page-set.active .page-item.active').length ||
        $('#reviews nav .page-set.active .page-item.active').is(':last-child')
    ) {
        initialReview = $(newSet).children().first()
    } else {
        initialReview = $(newSet).children().last()
    }

    $('#reviews nav .page-set.active').removeClass('active')
    newSet.addClass('active')

    changeReviewPage(initialReview[0])
}

function changeReviewPage(li) {
    let prevButton = $('#reviews nav .page-item.active').first()
    prevButton.removeClass('active')

    $(li).addClass('active')
    updateReviewElement(li.reviewData)

    checkPrevBtnStatus()
    checkNextBtnStatus()
}

function checkNextBtnStatus(
    li = $('#reviews nav .page-set.active .page-item.active')
) {
    if ($(li).is(':last-child') && !($(li).attr('data-continue') === 'true')) {
        disablePageControl($('#review-next'))
    } else {
        enablePageControl($('#review-next'))
    }
}
function checkPrevBtnStatus(li = $('#reviews nav .page-item.active')) {
    if ($(li).is(':first-child') && !($(li).attr('data-continue') === 'true')) {
        disablePageControl($('#review-prev'))
    } else {
        enablePageControl($('#review-prev'))
    }
}

function enablePageControl(link) {
    $(link).toggleClass('disabled', false)
}
function disablePageControl(link) {
    $(link).toggleClass('disabled', true)
}

function loadNewReviews() {
    const request = $.Deferred()

    $('#reviews nav').trigger('reviewsPageRequest')

    return request.promise()
}

'use strict'

$(document).ready(init())

function init() {
    const API = {}
    const APIRequest = retrieveAPIKeys()
    APIRequest.done((data) => {
        setAPIKeys(API, data)
    }).done(() => {
        const pageDataLoaded = populatePageData(API)
        pageDataLoaded
            .done(() => {
                initEventListeners(API)
            })
            .fail(() => {
                alert('Unable to load page data.')
            })
    })
}

function retrieveAPIKeys() {
    const request = $.Deferred()

    $.getJSON('./config.json', function (data) {
        request.resolve(data)
    }).fail(() => {
        console.error('Could not retrieve API keys!')
        request.reject()
    })

    return request.promise()
}
function setAPIKeys(API, JSON) {
    API.key = JSON.tmdbAPIKey
    API.RAToken = JSON.tmdbReadAccessToken
}

function retrieveUpcomingMovies(API) {
    const request = $.Deferred()

    $.get({
        url: `https://api.themoviedb.org/3/movie/upcoming?api_key=${API.key}&language=en-US&page=1`,
        success: (data) => {
            request.resolve(data)
        },
    }).fail(() => {
        console.error('Failed to retrieve upcoming movie info.')
        request.reject()
    })

    return request.promise()
}
function retrieveTopRatedMovies(API) {
    const request = $.Deferred()

    $.get({
        url: `https://api.themoviedb.org/3/movie/top_rated?api_key=${API.key}&language=en-US&page=1`,
        success: (data) => {
            request.resolve(data)
        },
    }).fail(() => {
        console.error('Failed to retrieve top rated movie info.')
        request.reject()
    })

    return request.promise()
}

function populatePageData(API) {
    const populated = $.Deferred()
    const upcomingPopulated = $.Deferred()
    const topRatedPopulated = $.Deferred()

    const upcomingRequest = retrieveUpcomingMovies(API)
    upcomingRequest.done((data) => {
        const upcoming = populateUpcoming(API, data)
        upcoming.done(() => {
            upcomingPopulated.resolve()
        })
    })
    const topRatedRequest = retrieveTopRatedMovies(API)
    topRatedRequest.done((data) => {
        const topRated = populateTopRated(API, data)
        topRated.done(() => {
            topRatedPopulated.resolve()
        })
    })

    $.when(upcomingPopulated, topRatedPopulated).done(() => {
        populated.resolve()
    })

    return populated.promise()
}

function populateUpcoming(API, movies) {
    const complete = $.Deferred()

    const upcomingMovies = populateUpcomingMovies(movies)
    const upcomingActors = populateUpcomingActors(API, movies)
    $.when(upcomingMovies, upcomingActors).done(() => {
        complete.resolve()
    })

    return complete.promise()
}
function populateUpcomingMovies(movies) {
    const completed = $.Deferred()

    for (let i = 0; i < 10; i++) {
        let movie = movies.results[i]
        let carouselItem = $(
            `#movies-carousel .carousel-item:nth-child(${i + 1})`
        )
        $(carouselItem).children().attr('data-id', movie.id)
        let img = $(carouselItem).find('img')

        img.attr('src', `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
    }

    createMultiSlideStructure()

    completed.resolve()
    return completed.promise()
}
function createMultiSlideStructure() {
    // Source: https://stackoverflow.com/questions/20007610/bootstrap-carousel-multiple-frames-at-once
    let items = $('#movies-carousel .carousel-item')
    items.each((i, el) => {
        // number of slides per carousel-item
        const minPerSlide = 3
        let next = el.nextElementSibling
        for (let i = 1; i < minPerSlide; i++) {
            if (!next) {
                // wrap carousel by using first child
                next = items[0]
            }
            let cloneChild = next.cloneNode(true)
            el.appendChild(cloneChild.children[0])
            next = next.nextElementSibling
        }
    })
}

function populateUpcomingActors(API, movies) {
    const completed = $.Deferred()

    const actorsRetrieved = retrieveUpcomingMovieActors(API, movies)
    actorsRetrieved.then((data) => {
        buildActorCarouselItems(data)
        completed.resolve()
    })

    return completed.promise()
}
function retrieveUpcomingMovieActors(API, movies) {
    const request = $.Deferred()
    let actors = {}
    for (let i = 0; i < 10; i++) {
        let castRequest = retrieveCast(API, movies.results[i].id)
        castRequest
            .done((data) => {
                actors = mergePopularCast(actors, data)
            })
            .then(() => {
                if (i === 9) {
                    request.resolve(actors)
                }
            })
    }

    return request.promise()
}
function retrieveCast(API, movieId) {
    const request = $.Deferred()

    $.get({
        url: `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API.key}&language=en-US`,
        success: (data) => {
            request.resolve(data)
        },
    }).fail(() => {
        console.error('Failed to retrieve movie cast.')
        request.reject()
    })

    return request.promise()
}
function mergePopularCast(actors, movieCredits) {
    const newActors = movieCredits.cast.sort(compareActorPopularity)
    actors[movieCredits.id] = newActors.slice(0, 10)
    actors = removeDuplicateCast(actors)

    return actors
}
function compareActorPopularity(a, b) {
    return b.popularity - a.popularity
}
function removeDuplicateCast(actors) {
    let selectedActors = {}
    for (let movie in actors) {
        selectedActors[movie] = []
        for (let actor of actors[movie]) {
            if (selectedActors[movie].length >= 3) {
                break
            } else {
                if (!duplicateActor(selectedActors, actor)) {
                    selectedActors[movie].push(actor)
                }
            }
        }
    }

    return selectedActors
}
function duplicateActor(actors, actor) {
    for (let movie in actors) {
        if (actors[movie].every((a) => a.id !== actor.id)) {
            continue
        } else {
            return true
        }
    }
    return false
}

function buildActorCarouselItems(actors) {
    let actorItems = []
    for (let movie in actors) {
        for (let actor of actors[movie]) {
            actorItems.push(createActorCarouselItem(actor, movie))
        }
    }

    $(actorItems[0]).addClass('active')
    for (let item of actorItems) {
        $('#actors-carousel').children('.carousel-inner').append(item)
    }
}
function createActorCarouselItem(actor, movieId) {
    let item = $('<div></div>').addClass('carousel-item')
    $(item).attr('data-movie-id', movieId)
    $(item).attr('data-actor-id', actor.id)
    let img = $('<img></img>').addClass('d-block mx-auto img-fluid')
    $(img).attr(
        'src',
        `https://image.tmdb.org/t/p/original${actor.profile_path}`
    )

    $(item).append(img)

    return item
}

function populateTopRated(API, movies) {
    const completed = $.Deferred()

    $('#top-ten .card').each((i, el) => {
        const movieImagesRequest = retrieveMovieImages(API, movies.results[i])
        let imageString = ''
        movieImagesRequest.done((images) => {
            let poster = getLangAppropriatePoster(
                movies.results[i],
                images.posters
            )
            imageString = poster.file_path
            $(el)
                .children('img')
                .attr(
                    'src',
                    `https://image.tmdb.org/t/p/original${imageString}`
                )
        })
    })

    completed.resolve()
    return completed.promise()
}

function retrieveMovieImages(API, movie) {
    const request = $.Deferred()

    $.get({
        url: `https://api.themoviedb.org/3/movie/${movie.id}/images?api_key=${API.key}`,
        success: (data) => {
            request.resolve(data)
        },
    }).fail(() => {
        console.error('Failed to retrieve movie cast.')
        request.reject()
    })

    return request.promise()
}
function getLangAppropriatePoster(movie, posters) {
    let poster = posters.find((el) => {
        return el.iso_639_1 == 'en'
    })
    if (poster === undefined) {
        poster = posters.find((el) => {
            return el.iso_639_1 == movie.original_language
        })
        if (poster === undefined) {
            poster = posters[0]
        }
    }
    return poster
}
function getLangAppropriateLogo(movie, logos) {
    let logo = logos.find((el) => {
        return el.iso_639_1 == 'en'
    })
    if (logo === undefined) {
        logo = logos.find((el) => {
            return el.iso_639_1 == movie.original_language
        })
        if (logo === undefined) {
            logo = logos[0]
        }
    }
    return logo
}

function initEventListeners(API) {
    attachMovieListeners(API)
}
function attachMovieListeners(API) {
    let upcomingMovies = $(`#movies-carousel .carousel-item > div`)

    const viewMovieListener = function (event) {
        viewMovieDetails(event.currentTarget, API)
    }
    $(upcomingMovies).each((i, el) => {
        el.addEventListener('click', viewMovieListener)
    })
}

function viewMovieDetails(target, API) {
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
function populateMovieDetails(movie) {
    const completed = $.Deferred()

    $('#title').text(movie.title)
    if (
        movie.original_language !== 'en' &&
        movie.title.toLowerCase() !== movie.original_title.toLowerCase()
    ) {
        $('#original-title').text(movie.original_title)
    } else {
        $('#original-title').text('')
    }
    $('#rating').text(movie.vote_average.toFixed(2))

    $('#poster').attr(
        'src',
        `https://image.tmdb.org/t/p/w200${movie.poster_path}`
    )

    $('#release-date').text(movie.release_date.slice(0, 4))
    $('#overview').text(movie.overview)

    populateMovieDetailsMisc(movie)

    populateMovieDetailsReviews(movie)

    completed.resolve()
    return completed.promise()
}
function populateMovieDetailsMisc(movie) {
    if (movie.genres.length > 0) {
        $('#genres').removeClass('hidden')
        let genreString = movie.genres[0].name
        for (let i = 1; i < movie.genres.length; i++) {
            genreString = genreString.concat(', ', movie.genres[i].name)
        }
        $('#genres').text(`Genres: ${genreString}`)
    } else {
        hideInfo($('#genres'))
    }
    if (movie.runtime !== 0) {
        $('#runtime').removeClass('hidden')
        $('#runtime').text(`Runtime: ${movie.runtime} minutes`)
    } else {
        hideInfo($('#runtime'))
    }
    if (movie.production_countries.length > 0) {
        $('#production-countries').removeClass('hidden')
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
        $('#spoken-languages').removeClass('hidden')
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
        $('#budget').removeClass('hidden')
        $('#budget').text(`Budget: $${movie.budget.toLocaleString()}`)
    } else {
        hideInfo($('#budget'))
    }
    if (movie.revenue !== 0) {
        $('#revenue').removeClass('hidden')
        $('#revenue').text(`Revenue: $${movie.revenue.toLocaleString()}`)
    } else {
        hideInfo($('#revenue'))
    }
}

function populateMovieDetailsReviews(movie) {
    if (movie.reviews.results.length === 0) {
        $('#no-reviews').toggleClass('hidden', false)
        $('#current-review').children().remove()
    } else {
        $('#no-reviews').toggleClass('hidden', true)
        if ($('#current-review').children().length > 0) {
            updateReviewElement(movie.reviews.results[0])
        } else {
            let review = createReviewElement(movie.reviews.results[0])
            $('#current-review').append(review)
        }
    }

    setReviewPagination(movie.reviews)
}

function createReviewElement(review) {
    let card = $(document.createElement('div')).addClass('card')
    $(card).attr('data-review-id', review.id)
    $(card).attr('data-author-username', review.author_details.username)

    let cardBody = $(document.createElement('div')).addClass('card-body')

    let body = $(document.createElement('p'))
        .addClass('card-text')
        .text(review.content)

    let info = $(document.createElement('div')).addClass('review-info')
    let avatar = $(document.createElement('img'))
    if (review.author_details.avatar_path) {
        $(avatar)
            .attr('src', getReviewAvatarPath(review))
            .addClass('rounded-circle')
    } else {
        $(avatar).addClass('hidden')
    }

    let infoText = $(document.createElement('div'))
    let author = $(document.createElement('h5'))
        .addClass('card-title')
        .text(getAuthorAndRatingString(review))

    let creationDate = new Date(review.created_at)
    let date = $(document.createElement('h6'))
        .addClass('card-subtitle')
        .text(creationDate.toLocaleString())

    infoText.append(author, date)
    info.append(avatar, infoText)
    card.append(cardBody.append(body, info))
    return card
}

function updateReviewElement(review) {
    let card = $('#current-review').children().first()

    $(card).attr('data-review-id', review.id)
    $(card).attr('data-author-username', review.author_details.username)

    $(card).find('.card-text').first().text(review.content)

    if (review.author_details.avatar_path) {
        $(card).find('img').first().attr('src', getReviewAvatarPath(review))
        $(card).find('img').first().removeClass('hidden')
    } else {
        $(card).find('img').first().attr('src', '')
        $(card).find('img').first().addClass('hidden')
    }

    $(card).find('.card-title').first().text(getAuthorAndRatingString(review))

    let creationDate = new Date(review.created_at)
    $(card).find('.card-subtitle').first().text(creationDate.toLocaleString())
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
        avatarPath = `https://image.tmdb.org/t/p/w200${review.author_details.avatar_path}`
    }
    return avatarPath
}
function getAuthorAndRatingString(review) {
    if (review.author_details.rating) {
        return `${review.author_details.rating} by ${review.author}`
    } else {
        return `${review.author}`
    }
}

function setReviewPagination(reviews) {
    $('#reviews nav').on('click', '.control', function (event) {
        incrementReview(event.currentTarget)
    })

    if (reviews.results.length > 0) {
        $('#reviews nav').removeClass('disabled')
        disablePageControl($('#review-prev'))
        for (let i = 0; i < reviews.results.length; i++) {
            createPageLink(reviews, i, reviews.results[i])
        }
        addReviewPageEventListeners()
        // Select default first review
        $('#reviews nav .page-item:nth-child(2)').addClass('active').off()

        if (reviews.results.length > 1) {
            enablePageControl($('#review-next'))
        } else {
            disablePageControl($('#review-next'))
        }
    } else {
        $('#reviews nav').addClass('hidden')
    }
}
function enablePageControl(link) {
    $(link).toggleClass('disabled', false)
}
function disablePageControl(link) {
    $(link).toggleClass('disabled', true)
}
function incrementReview(btn) {
    if ($(btn).hasClass('disabled')) {
        return
    } else {
        let newReview
        if (btn.id === 'review-prev') {
            newReview = $('#reviews nav .active').prev('.specific')
        } else if (btn.id === 'review-next') {
            newReview = $('#reviews nav .active').next('.specific')
        } else {
            console.error('Unexpected event target incrementing viewed review.')
        }
        if (newReview[0]) {
            changeReviewPage(newReview)
        } else {
            console.log('end of shown items')
            // Get new review page
        }

        if (newReview[0] === $('#reviews nav .specific')[0]) {
            disablePageControl($('#review-prev'))
        } else {
            enablePageControl($('#review-prev'))
        }
    }
}
function createPageLink(reviews, reviewIndex, review) {
    let li = $(document.createElement('li')).addClass('page-item specific')
    li.append(
        $(document.createElement('a'))
            .addClass('page-link')
            .text(reviewIndex + 1)
    )

    let btns = $('#reviews nav .page-item')
    li.insertAfter($(btns)[btns.length - 2])
}

function addReviewPageEventListeners() {
    $('#reviews nav .specific').on('click', (event) => {
        changeReviewPage(event.currentTarget)
    })
}
function changeReviewPage(li) {
    let prevButton = $('#reviews nav .active').first()
    prevButton.removeClass('active')
    prevButton.on('click', (event) => {
        changeReviewPage($(event.currentTarget))
    })

    $(li).addClass('active')
    $(li).off()
}

function hideInfo(element) {
    $(element).text = ''
    $(element).addClass('hidden')
}

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
            $(el).attr('data-id', movies.results[i].id)
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
    const upcomingMovies = $('#movies-carousel .carousel-item > div')
    const topMovies = $('#top-ten .card')

    const viewMovieListener = function (event) {
        viewMovieDetails(API, event.currentTarget)
    }
    $(upcomingMovies).each((i, el) => {
        el.addEventListener('click', viewMovieListener)
    })
    $(topMovies).each((i, el) => {
        el.addEventListener('click', viewMovieListener)
    })

    const featuringActors = $('#actors-carousel .carousel-item')

    const viewActorListener = function (event) {
        viewActorDetails(API, event.currentTarget)
    }
    $(featuringActors).each((i, el) => {
        el.addEventListener('click', viewActorListener)
    })

    addReviewPageListeners(API)

    addDetailsViewListeners()
}

function addDetailsViewListeners() {
    // ISSUE: pause() might still not work while carousels are transitioning?
    // Haven't been able to confirm.
    $('#info-collapse').on('show.bs.collapse', () => {
        // JQuery compatible bootstrap methods & html attrs not working.
        // Use standard bootstrap JS.
        let moviesCarousel = bootstrap.Carousel.getInstance(
            document.getElementById('movies-carousel')
        )
        let actorsCarousel = bootstrap.Carousel.getInstance(
            document.getElementById('actors-carousel')
        )
        moviesCarousel.pause()
        actorsCarousel.pause()
    })

    $('#info-collapse').on('hidden.bs.collapse', resetInfoDetails)
    $('#info-collapse').on('hidden.bs.collapse', () => {
        let moviesCarousel = bootstrap.Carousel.getInstance(
            document.getElementById('movies-carousel')
        )
        let actorsCarousel = bootstrap.Carousel.getInstance(
            document.getElementById('actors-carousel')
        )
        moviesCarousel.cycle()
        actorsCarousel.cycle()
    })
}

function addReviewPageListeners(API) {
    const reviewsPageRequest = $.Event('reviewsPageRequest')

    $('#reviews nav').on('reviewsPageRequest', () => {
        const request = retrieveReviewsPage(API)
        request.done((reviews) => {
            populateReviewPagination(reviews, reviews.page * 20 - 20 + 1)
        })
    })

    $('#reviews nav').on('click', '.index', (event) => {
        changeReviewPage(event.currentTarget)
    })

    $('#reviews nav').on('click', '.control', function (event) {
        incrementReview(event.currentTarget)
    })
}

function resetInfoDetails() {
    // Reset movie/actor elements which may have been hidden.
    $('#info-collapse .hidden').removeClass('hidden')
    // Reset id on containers, re-add initially hidden els.
    $('#movie-details').addClass('hidden').removeAttr('data-movie-id')
    $('#actor-details').addClass('hidden').removeAttr('data-actor-id')
    $('#no-reviews').addClass('hidden')
    // Reset reviews & their pagination
    $('#current-review').children().remove()
    $('#reviews nav .page-set').remove()
    // Reset actor credits
    $('#actor-details #credits').children().remove()
}

$('#testButton').on('click', () => {
    $.get({
        url: `https://api.themoviedb.org/3/movie/299534?api_key=2f53ed057a5040f94bf52c398ed4a659&language=en-US&append_to_response=credits,reviews`,
        success: (data) => {
            $('#testButton').attr('data-id', data.id)
            viewMovieDetails(
                {key: '2f53ed057a5040f94bf52c398ed4a659'},
                $('#testButton')
            )
        },
    })
})

function hideInfo(element) {
    $(element).addClass('hidden')
}

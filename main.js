'use strict'

$(document).ready(init())

function init() {
    const API = {}
    const APIRequest = retrieveAPIKeys()
    APIRequest.done((data) => {
        setAPIKeys(API, data)
    })
        .then(() => {
            populatePageData(API)
        })
        .fail(() => {
            alert('Unable to load movie data.')
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

function populatePageData(API) {
    console.log('Building page.')
    const upcomingRequest = retrieveUpcomingMovies(API)
    upcomingRequest.done((data) => {
        populateUpcoming(data)
        populateActors(API, data)
    })
}
function populateUpcoming(movies) {
    for (let i = 0; i < 10; i++) {
        let movie = movies.results[i]
        let carouselItemImg = $(
            `#movies-carousel .carousel-item:nth-child(${i + 1}) img`
        )

        carouselItemImg.attr(
            'src',
            `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        )
    }

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

function populateActors(API, movies) {
    const actorsRetrieved = retrieveUpcomingMovieActors(API, movies)
    actorsRetrieved.then((data) => {
        buildActorCarouselItems(data)
    })
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
    console.log(actors)
    let actorItems = []
    for (let movie in actors) {
        for (let actor of actors[movie]) {
            actorItems.push(createActorCarouselItem(actor, movie))
        }
    }

    console.log(actorItems)
    $(actorItems[0]).addClass('active')
    for (let item of actorItems) {
        $('#actors-carousel').children('.carousel-inner').append(item)
    }
}
function createActorCarouselItem(actor, movieId) {
    let item = $('<div></div>').addClass('carousel-item')
    $(item).attr('data-movie-id', movieId)
    let img = $('<img></img>').addClass('d-block mx-auto img-fluid')
    $(img).attr(
        'src',
        `https://image.tmdb.org/t/p/original${actor.profile_path}`
    )

    $(item).append(img)

    return item
}

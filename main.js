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
    for (let i = 0; i < 3; i++) {
        let movie = movies.results[i]
        let carouselItem = $(
            `#movies-carousel .carousel-item:nth-child(${i + 1})`
        )
        let carouselItemImg = $(carouselItem).children('img')

        carouselItemImg.attr(
            'src',
            `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        )
    }
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
                mergePopularCast(actors, data)
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
    let newActors = movieCredits.cast.sort(compareActorPopularity)
    actors[movieCredits.id] = [newActors[0], newActors[1], newActors[2]]
    // removeDuplicateCast(actors, data)
}
function compareActorPopularity(a, b) {
    return b.popularity - a.popularity
}
function removeDuplicateCast(actors, newActors) {
    // Remove both newActors already in actors
    // and popular actors playing multiple characters in newActors.
    // Probably need to do this earlier.
    return actors
}

function buildActorCarouselItems(actors) {
    console.log(actors)
    for (let actor in actors) {
        // let carouselItem = $(
        //     `#movies-carousel .carousel-item:nth-child(${i + 1})`
        // )
        // let carouselItemImg = $(carouselItem).children('img')
        // carouselItemImg.attr(
        //     'src',
        //     `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        // )
    }
}

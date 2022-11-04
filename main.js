'use strict'

$(document).ready(init())

function init() {
    const API = {}
    $.when(
        $.getJSON('./config.json', function (data) {
            API.key = data.tmdbAPIKey
            API.RAToken = data.tmdbReadAccessToken
        }).fail(function () {
            console.error('Failed to load config info needed for API calls!')
        })
    ).then(testAPIRequest(API))
}

function testAPIRequest(API) {
    $.get({
        url: `https://api.themoviedb.org/3/search/movie?api_key=${API.key}&language=en-US&query=fast&page=1&include_adult=false`,
        success: (data) => {
            console.log(data)
        },
        dataType: 'application/json',
    })
}

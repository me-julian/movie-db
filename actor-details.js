'use strict'

function viewActorDetails(API, target) {
    let collapseEl = document.querySelector('#info-collapse')
    if ($(collapseEl).hasClass('show')) {
        $(collapseEl).collapse('hide')
    }

    let actorId = $(target).attr('data-actor-id')
    const ActorDetailsRequest = retrieveActorDetails(API, actorId)
    ActorDetailsRequest.done((data) => {
        const detailsLoaded = populateActorDetails(data)
        detailsLoaded.done(() => {
            $(collapseEl).collapse('show')
        })
    })
}

function retrieveActorDetails(API, actorId) {
    const request = $.Deferred()

    $.get({
        url: `https://api.themoviedb.org/3/person/${actorId}?api_key=${API.key}&language=en-US&append_to_response=movie_credits%2Cimages`,
        success: (data) => {
            console.log(data)
            request.resolve(data)
        },
    }).fail(() => {
        console.error('Failed to retrieve actor details.')
        request.reject()
    })

    return request.promise()
}

function populateActorDetails(actor) {
    const completed = $.Deferred()

    $('#actor-details').attr('data-actor-id', actor.id).removeClass('hidden')

    $('#actor-details #portrait')
        .attr('src', `https://image.tmdb.org/t/p/original${actor.profile_path}`)
        .addClass('w-100')
    $('#actor-details #name').text(actor.name)

    setBiographyString(actor.biography)

    if (actor.birthday) {
        $('#actor-details #age').text(
            getActorAgeString(actor.birthday, actor.deathday)
        )
    } else {
        hideInfo('#actor-details #age')
    }

    if (actor.place_of_birth) {
        $('#actor-details #p-o-b').text(actor.place_of_birth)
    } else {
        hideInfo('#actor-details #p-o-b')
    }

    populateActorCredits(actor.movie_credits.cast)

    completed.resolve()
    return completed.promise()
}
function getActorAgeString(bDay, dDay) {
    bDay = bDay.split('-')
    const bDate = new Date(...bDay)

    const options = {year: 'numeric', month: 'long', day: 'numeric'}
    let string = `Born ${bDate.toLocaleDateString(undefined, options)}`

    let age
    if (dDay !== null) {
        const dDate = new Date(endDay)
        age = calcAge(bDate.getTime(), dDate.getTime())
        return (string += `, died ${dDate.toLocaleDateString(
            undefined,
            options
        )}} at ${age}`)
    } else {
        age = calcAge(bDate.getTime(), Date.now())
        return (string += ` (${age})`)
    }
}
function calcAge(bDate, endDate) {
    const ageDifMs = endDate - bDate
    const ageDate = new Date(ageDifMs) // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970)
}

function setBiographyString(bio) {
    if (bio.includes('Description above from')) {
        bio = bio.split('Description above from ')
        $('#actor-details #bio').text(bio[0])
        $('#actor-details #bio-src').text(`Description above from ${bio[1]}`)
    } else {
        $('#actor-details #bio').text(bio)
        hideInfo($('#actor-details #bio-src'))
    }
}

function populateActorCredits(credits) {
    const container = $('#actor-details #credits')
    credits = credits.sort(sortCreditDate)
    for (let credit of credits) {
        if (credit.character) {
            container.append(
                $(document.createElement('li'))
                    .addClass('d-flex align-items-center cast-credit')
                    .attr('data-movie-id', credit.id)
                    .html(getCastCreditString(credit))
            )
        } else {
            continue
        }
    }
}
function sortCreditDate(a, b) {
    if (!a.release_date) {
        return -1
    } else {
        a = a.release_date.split('-')
        const aDate = new Date(...a)
        b = b.release_date.split('-')
        const bDate = new Date(...b)
        return bDate - aDate
    }
}
function getCastCreditString(credit) {
    const character = `<div><p class="my-0">${credit.character}</p>`
    const title = `<p class="my-0 fst-italic">${credit.title}</p6></div>`
    let release
    if (credit.release_date) {
        release = credit.release_date.substr(0, 4)
    } else {
        release = 'TBA'
    }
    const date = `<p class="my-0 ms-auto justify-self-end">${release}</p>`
    return character + title + date
}

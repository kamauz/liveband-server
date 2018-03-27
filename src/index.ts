import "reflect-metadata"

import {createConnection} from "typeorm"
import {User} from "./entity/User"
import {Location} from "./entity/Location"
import {Instrument} from "./entity/Instrument"
import {Genre} from "./entity/Genre"
import {Preference } from "./entity/Preference"
import {Ability} from "./entity/Ability"
import {Announce} from "./entity/Announce"
import {Event} from "./entity/Event"
import {Band} from "./entity/Band"
import { emit } from "cluster";

createConnection().then(async conn => {
    var {server,privateKey} = require('./server')
    var {createSimpleEntityValue, facebookAuth, getEventsOwnedByUser, getLocationWithPeopleGenreAndInstrument, getLocationsWithEventAndGenre, getLocationPeopleGenre, createAnnounce, getUsersGivenInstrumentAndGenreAndLocation, getUsersGivenInstrumentAndLocation, getUsersGivenGenreAndLocation, getUsersInLocation, handleUserInstruments, getUserInstruments, handleUserGenres, getUserGenres, createEvent, createBand, get, createUser, getEntityValues, verifyUser, generateJwtToken, getFacebookInfo, isA, addItem, getAndCreate, complexItem, treatError} = require('./function')(conn)
    var jwt = require('restify-jwt')

    // OK
    server.get('/band', async (req, res, next) => {
        get({ relations: ["genre", "place", "user"] }, Band)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.post('/band', async (req, res, next) => {
        createBand(req.body.band)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })
    
    server.post('/account/login', async (req, res, next) => {
        try {
            const result = await facebookAuth(req.body.facebookAuth)
            res.send(result)
        } catch(e) {
            res.send(treatError(emit))
        }
        return next()
    })
    
    // OK
    server.post('/event', async (req, res, next) => {
        createEvent(req.body.event)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/user', async (req, res, next) => {
        get({ relations: ["place", "genre", "instrument"] }, User)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/user/:id', async (req, res, next) => {
        get({ where: { id: req.params.id }, relations: ["place", "genre", "instrument"] }, User)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })
    
    // OK
    server.post('/user', async (req, res, next) => {
        createUser(req.body.user)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(e))
        next()
    })

    // OK
    server.get('/user/:id/genre', async (req, res, next) => {
        getUserGenres(req.params.id)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.post('/user/:id/genre', async (req, res, next) => {     
        handleUserGenres(req)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/user/:id/instrument', async (req, res, next) => {
        getUserInstruments(req.params.id)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.post('/user/:id/instrument', async (req, res, next) => {
        handleUserInstruments(req)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/user/location/:id', async (req, res, next) => {
        getUsersInLocation(req.params.id)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/user/location/:id/genre/:gid', async (req, res, next) => {
        getUsersGivenGenreAndLocation(req.params)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/user/location/:id/instrument/:iid', async (req, res, next) => {
        getUsersGivenInstrumentAndLocation(req.params)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(e))
        next()
    })

    // OK
    server.get('/user/location/:id/genre/:gid/instrument/:iid', async (req, res, next) => {
        getUsersGivenInstrumentAndGenreAndLocation(req.params)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(e))
        next()
    })

    // OK
    server.get('/location', async (req, res, next) => {
        get({}, Location)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(e))
        next()
    })

    // OK
    server.post('/location', async (req, res, next) => {
        createSimpleEntityValue(req.body.location, Location)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/location/event/genre/:gid', async (req, res, next) => {
        getLocationsWithEventAndGenre(req.params.gid)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/location/genre/:gid', async (req, res, next) => {
        getLocationPeopleGenre(req.params.gid)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
    })

    
    server.get('/location/genre/:gid/instrument/:iid', async (req, res, next) => {
        getLocationWithPeopleGenreAndInstrument(req.params)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/location/:name', async (req, res, next) => {
        get({ name: req.params.name}, Location)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/genre', async (req, res, next) => {
        get({}, Genre)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.post('/genre', async (req, res, next) => {
        createSimpleEntityValue(req.body.genre, Genre)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/genre/:id', async (req, res, next) => {
        get({ id: req.params.id }, Genre)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/instrument', async (req, res, next) => {
        get({}, Instrument)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/announce', async (req, res, next) => {
        get({ relations: ["location","owner"] }, Announce)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.post('/announce', async (req, res, next) => {
        createAnnounce(req.body)
            .then((result) =>{
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/announce/:id', async (req, res, next) => {
        get({ where: { id: req.params.id }, relations: ["location","owner"] }, Announce)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.post('/instrument', async (req, res, next) => {
        createSimpleEntityValue(req.body.instrument, Instrument)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/instrument/:name', async (req, res, next) => {
        get({ name: req.params.name }, Instrument)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/event', async (req, res, next) => {
        get({ relations: ["location", "owner", "bands"] }, Event)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/event/:id', async (req, res, next) => {
        get({ where: { id: req.params.id }, relations: ["location","owner","bands"] }, Event)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })

    // OK
    server.get('/event/user/:id', async (req, res, next) => {
        getEventsOwnedByUser(req.params.id)
            .then((result) => {
                res.send(result)
            }).catch((e) => res.send(treatError(e)))
        next()
    })
    
}).catch(error => console.log('ERROR: '+error))

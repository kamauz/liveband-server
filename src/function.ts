import {User} from "./entity/User"
import {Location} from "./entity/Location"
import {Instrument} from "./entity/Instrument"
import {Genre} from "./entity/Genre"
import {Preference } from "./entity/Preference"
import {Ability} from "./entity/Ability"
import {Announce} from "./entity/Announce"
import {Event} from "./entity/Event"
import {Band} from "./entity/Band"
import { resolve } from "dns";

module.exports = function(conn) {
    var axios = require('axios')
    var privateKey = require('./privatekey')
    var jwt = require('jsonwebtoken')
    var jwt_crypt = require('jsonwebtoken')

    var fb = "https://graph.facebook.com"

    async function addItem<T>(data, T) {
        try {
            let obj = Object.assign(new T, data)

            // check correct instance (??)
            if (!(obj instanceof T)) {
                throw { error: "Error while parsing the input" }
            }

            // add item
            const result = await conn.getRepository(T).save(obj)
            return result
        } catch (e) {
            console.log(e)
            throw e
        } 
    }

    async function getMany<T>(arr, T) : Promise<T[]>{
        const promiseArray:T[] = arr.map(element => get<T>(element, T))
        const result = await Promise.all(promiseArray).catch(e => { throw e })
        return result
    }

    async function getAndCreateMany<T>(arr:T[], T) : Promise<T[]>{
        const promiseArray = arr.map(element => getAndCreate<T>(element, T))
        const result = await Promise.all(promiseArray).catch((e) => { throw e })
        return result
    }

    async function getAndCreate<T>(data: T, T) : Promise<T> {

            console.log('getAndCreate')
            let filter_data = removeObjects(data)
            let got = await conn.getRepository(T).findOne(filter_data).catch((e) => { throw e })
            if (got) return got
            else {
                let additem = await addItem(filter_data, T).catch((e) => { throw e })
                return additem
            }
    }

    function getFacebookInfo(accessToken) {
        return new Promise((resolve, reject) => {
            var result
            var a = axios.get(fb+'/me', {
                params: {
                access_token: accessToken
                }
            })
            .then(async (response) => {
                var name = response.data.name.split(" ")
                var json = {
                    lastname: name.pop(),
                    firstname: name.join(" "),
                    facebook: response.data.id
                }
                console.log(json)
                resolve(json)
            }).catch(async (error) => reject(error));
        })
    }

    async function get<T>(filter, T) : Promise<T> {
        let values = await getEntityValues<T>(filter, T).catch((e) => { throw e })
        return values
    }

    function removeObjects(obj) {
        let newObj = {}
        Object.keys(obj).forEach(key => {
          if (!isA(obj[key], 'object')) {
            newObj[key] = obj[key]
          }
        })
        return newObj
      }

    async function createEvent(event) : Promise<Event> {
        // input data check
        if (!isA(event.owner, "object")) throw { error: "No owner selected" }
        if (!isA(event.location, "object")) throw { error: "Location not found" }
        if (!isA(event.bands, "object")) throw { error: "No band selected" }

        // check whether event is not already registered
        conn.getRepository(Event).findOne(event)
            .then((result) => { throw { error: "Event already registered" }})

        // create all the entities independently
        let promises : [Promise<Band[]>, Promise<User>, Promise<Location>, Promise<Event>] = [
            getMany(event.bands, Band),
            get(event.owner, User),
            getAndCreate(event.location, Location),
            getAndCreate(event, Event)
        ]

        let result = await Promise.all(promises).catch((e) => { throw e })
        // fill foreign key references
        result[3].bands = [].concat(...result[0])
        result[3].owner = result[1]
        result[3].location = result[2]
        console.log(result[3])
        console.log(result[0])

        // update entity row
        let save = await conn.manager.save(result[3]).catch((e) => { throw e })
        return result[3]

    }

    async function createBand(band) : Promise<Band> {
        // input data check
        console.log('createBand')
        if (!isA(band.genre, "object")) throw { error: "No genres selected" }
        if (!isA(band.location, "object")) throw { error: "Location not found" }
        if (!isA(band.user, "object")) throw { error: "Users not found" }

        // check whether band is not already registered
        let check = await conn.getRepository(Band).findOne(removeObjects(band))
        if (check) throw { error: "Band already registered" }

        // create all the entities independently
        let promises : [Promise<Genre[]>, Promise<Location>, Promise<User[]>, Promise<Band>] = [
            getAndCreateMany(band.genre, Genre),
            getAndCreate(band.location, Location),
            getAndCreateMany(band.user, User),
            getAndCreate(band, Band)
        ]

        // execute calls in sequence
        let result = await Promise.all(promises).catch((e) => { throw e })
        let obj = result[3]

        // fill foreign key references
        obj.genre = [].concat(...result[0])
        obj.place = result[1]
        obj.user = [].concat(...result[2])
        console.log(obj)

        // update entity row
        let save = await conn.manager.save(obj).catch((e) => { throw e })
        return obj
    }

    async function createAnnounce(params) {

        // create all the entities independently
        let promises : [Promise<User>, Promise<Location>, Promise<Announce>] = [
            getAndCreate(params.announce.owner, User),
            getAndCreate(params.announce.location, Location),
            getAndCreate(params.announce, Announce)
        ]
        let result = await Promise.all(promises).catch((e) => { console.log(e); throw e })
        
        // fill foreign key references
        result[2].owner = result[0]
        result[2].location = result[1]
        console.log(result[2])

        // update entity row
        let save = await conn.manager.save(result[2]).catch((e) => { throw e })
        return result[2]

    }

    async function alreadyExist<T>(data, T) : Promise<User> {
        let result = await conn.getRepository(T).find(data).catch((e) => { throw e })
        if (!result) return Promise.reject({ error: "Item does not exist" })
        else return result
    }

    // OK
    async function getUserInstruments(uid) : Promise<Instrument[]> {
        if (!isA(uid, "string")) throw { error: "Invalid id" }
        let id = parseInt(uid)
        let result = await conn.getRepository(User).findOne({ where: { id: id }, relations: ["instrument"] })
        return result.instrument
    }

    // OK
    async function getUsersInLocation(lid) {
        if (typeof (lid) != "string") throw { error: "Invalid id" }
        let id = parseInt(lid)

        let result = await conn.getRepository("User")
            .createQueryBuilder("user")
            .innerJoinAndSelect("location", "location", "user.place = location.id")
            .where("placeId = :id")
            .setParameter("id", id)
            .getMany()
            .catch((e) => { throw e })
        return result
    }

    async function getUserGenres(uid) : Promise<Genre[]> {
        let id = parseInt(uid)
        let result = await conn.getRepository(User).findOne({ where: { id: id }, relations: ["genre"] }, User).catch((e) => { throw e })
        console.log(result)
        return result.genre
    }

    // OK
    async function getUsersGivenGenreAndLocation(params) {
        if (!isA(params.id, "string") || !isA(params.gid, "string")) throw { error: "Invalid id" }
        let id = parseInt(params.id)
        let gid = parseInt(params.gid)

        let result = await conn.getRepository("User")
            .createQueryBuilder("user")
            .innerJoinAndSelect("location", "location", "user.place = location.id")
            .innerJoinAndSelect("user_genre_genre", "user_genre_genre", "user.id = user_genre_genre.userId")
            .innerJoinAndSelect("genre", "genre", "genre.id = user_genre_genre.genreId")
            .where("location.id = :id AND genreId = :gid")
            .setParameters({ id: id, gid: gid })
            .getMany()
            .catch((e) => { throw e })

        return result
    }

    // OK
    async function getUsersGivenInstrumentAndLocation(params) {
        if (!isA(params.id, "string") ||
            !isA(params.iid, "string")) throw { error: "Invalid id" }
        
        let id = parseInt(params.id)
        let iid = parseInt(params.iid)
        
        let result = await conn.getRepository("User")
            .createQueryBuilder("user")
            .innerJoinAndSelect("location", "location", "user.place = location.id")
            .innerJoinAndSelect("user_instrument_instrument", "user_instrument_instrument", "user.id = user_instrument_instrument.userId")
            .innerJoinAndSelect("instrument", "instrument", "instrument.id = user_instrument_instrument.instrumentId")
            .where("placeId = :id AND instrumentId = :iid")
            .setParameters({ id: id, iid: iid })
            .getMany()
            .catch((e) => { throw e })

        return result
    }

    async function getUsersGivenInstrumentAndGenreAndLocation(params) {
        if (!isA(params.id, "string") ||
            !isA(params.gid, "string") ||
            !isA(params.iid, "string")) throw { error: "Invalid id" }
        
        let id = parseInt(params.id)
        let iid = parseInt(params.iid)
        let gid = parseInt(params.gid)

        let result = await conn.getRepository("User")
            .createQueryBuilder("user")
            .innerJoinAndSelect("location", "location", "user.place = location.id")
            .innerJoinAndSelect("user_genre_genre", "user_genre_genre", "user.id = user_genre_genre.userId")
            .innerJoinAndSelect("genre", "genre", "genre.id = user_genre_genre.genreId")
            .innerJoinAndSelect("user_instrument_instrument", "user_instrument_instrument", "user.id = user_instrument_instrument.userId")
            .innerJoinAndSelect("instrument", "instrument", "instrument.id = user_instrument_instrument.instrumentId")
            .where("placeId = :id AND instrumentId = :iid AND genreId = :gid")
            .setParameters({ id: id, iid: iid, gid: gid })
            .getMany()
            .catch((e) => { throw e })

        return result
    }

    async function getLocationPeopleGenre(id) {

        if (!(isA(id, "string"))) throw { error: "Invalid id" }
        let gid = parseInt(id)
        
        let result = await conn.getRepository("Location")
            .createQueryBuilder("location")
            .innerJoinAndSelect("user", "user", "user.place = location.id")
            .innerJoinAndSelect("user_genre_genre", "user_genre_genre", "user_genre_genre.userId = user.id")
            .innerJoinAndSelect("genre", "genre", "genre.id = user_genre_genre.genreId")
            .where("genreId = :id")
            .setParameter("id", gid)
            .getMany()
            .catch((e) => { throw e })

        return result
    }

    async function getLocationWithPeopleGenreAndInstrument(params) {
        if (!isA(params.gid, "string") ||
            !isA(params.iid, "string")) throw { error: "Invalid id" }

        let gid = parseInt(params.gid)
        let iid = parseInt(params.iid)

        let result = await conn.getRepository("Location")
            .createQueryBuilder("location")
            .innerJoinAndSelect("user", "user", "user.place = location.id")
            .innerJoinAndSelect("user_genre_genre", "user_genre_genre", "user_genre_genre.userId = user.id")
            .innerJoinAndSelect("genre", "genre", "genre.id = user_genre_genre.genreId")
            .innerJoinAndSelect("user_instrument_instrument", "user_instrument_instrument", "user_instrument_instrument.userId = user.id")
            .innerJoinAndSelect("instrument", "instrument", "instrument.id = user_instrument_instrument.instrumentId")
            .where("genreId = :gid AND instrumentId = :iid")
            .setParameters({ gid: gid, iid: iid })
            .getMany()
            .catch((e) => { throw e })

        return result
    }

    async function getLocationsWithEventAndGenre(id) {
        if (!isA(id, "string")) throw { error: "Invalid id" }
        let gid = parseInt(id)

        let result = await conn.getRepository("Location")
            .createQueryBuilder("location")
            .innerJoinAndSelect("event", "event", "event.location = location.id")
            .innerJoinAndSelect("event_bands_band", "event_bands_band", "event_bands_band.eventId = event.id")
            .innerJoinAndSelect("band", "band", "band.id = event_bands_band.bandId")
            .innerJoinAndSelect("band_genre_genre", "band_genre_genre", "band.id = band_genre_genre.bandId")
            .innerJoinAndSelect("genre", "genre", "genre.id = band_genre_genre.genreId")
            .where("genreId = :id")
            .setParameter("id", gid)
            .getMany()
            .catch((e) => { throw e })

        return result
    }

    async function getEventsOwnedByUser(uid) {
        if (!uid) throw { error: "Error in the input" }
        var id = parseInt(uid)

        let result = await conn.getRepository("Event")
            .createQueryBuilder("event")
            .innerJoinAndSelect("user", "user", "event.owner = user.id")
            .where("ownerId = :id")
            .setParameter("id", id)
            .getMany()
            .catch((e) => { throw e })

        return result
    }

    // OK
    async function handleUserInstruments(params) {
        if (!params.body.action || !isA(params.params.id, "string") || !isA(params.body.instrument, "object")) {
           throw { error: "Error while deciding the action" }
        }
        if (params.body.action != "add" && params.body.action != "rem") {
            throw { error: "Invalid action" }
        }
        let result = await handleArrayData(params.body.action, User, params.params.id, Instrument, 'instrument', 'name', params.body.instrument, ["instrument"])
            .catch((e) => { console.log(e); throw e })
        console.log(result)
        return result            
    }

    // OK
    async function handleUserGenres(params) {
        if (!params.body.action || !isA(params.params.id, "string") || !isA(params.body.genre, "object")) {
            throw { error: "Error while deciding the action" }
        }
        if (params.body.action != "add" && params.body.action != "rem") {
            throw { error: "Invalid action" }
        }

        let result = await handleArrayData(params.body.action, User, params.params.id, Genre, 'genre', 'name', params.body.genre, ["genre"])
            .catch((e) => { console.log(e); throw e })
        console.log(result)
        return result          
    }

    async function getEntityValues<T>(filter, T) : Promise<T> {
        // filter the entity values 
        let result : T = await conn.getRepository(T).find(filter).catch((e) => { throw e })
        return result
    }

    async function createUser(user) : Promise<User> {
        // input check
        if (!isA(user, "object")) throw { error: "Malformed user data" }
        if (!isA(user.place, "object")) throw { error: "Place is missing" }
        if (!isA(user.genre, "object")) throw { error: "Genre is missing" }
        if (!isA(user.instrument, "object")) throw { error: "Instrument is missing" }

        console.log(removeObjects(user))
        // check whether user is not already registered
        let check = await conn.getRepository(User).findOne(removeObjects(user)).catch((e) => { throw { error: "User already registered" }})

        console.log(user.instrument)

        // create all the entities independently
        let promises : [Promise<Instrument[]>, Promise<Genre[]>, Promise<Location>, Promise<User>] = [
            getAndCreateMany(user.instrument, Instrument),
            getAndCreateMany(user.genre, Genre),
            getAndCreate(user.place, Location),
            getAndCreate(user, User)
        ]
        let result = await Promise.all(promises).catch((e) => { console.log(e); throw e })

        // fill foreign key references
        result[3].instrument = [].concat(...result[0])
        result[3].genre = [].concat(...result[1])
        result[3].place = result[2]

        console.log(result[3])

        // update entity row
        let save = await conn.getRepository(User).save(result[3])
        return result[3]
    }

    async function createSimpleEntityValue<T>(data, T) {
        // input check
        if (!isA(data, "object")) Promise.reject({ error: "Malformed input" })

        // create the item if not exists
        let result = await getAndCreate(data, T).catch((e) => { throw e })
        return result
    }

    function treatError(error) {
        // handle the error response to the user in informative way
        switch (error.code) {
            case "ER_DUP_ENTRY": {
                return { error: "The resource is already been registered" }
            }
            case "ER_BAD_FIELD_ERROR": {
                return { error: "Bad field input" }
            }
            default: {
                return error
            }
        }
    }

    async function verifyUser(json) {
        return new Promise((resolve, reject) => {
            // reject whether token is not found
            if (!json.token) reject({ error: "Token is missing" })
            // verify user token in the request header
            jwt.verify(json.token, privateKey, function(err, decoded) {
                if(err) reject({ error: "Error when decrypting the token" })
                resolve(decoded)
            })
        });
    }

    async function facebookAuth(token) {
        return new Promise((resolve, reject) => {
            if (token) {
                getFacebookInfo(token).then((user_fbinfo) => {
                    let user = user_fbinfo
                    conn.getRepository(User).findOne(user).then((authuser) => {
                        if (!authuser) {
                            var newUser = Object.assign(new User, user)
                            conn.manager.save(newUser)
                        }
                        console.log(privateKey)
                        user['token'] = jwt_crypt.sign(user, privateKey)
                        resolve(user)
                    })
                })                
            }
            reject({ error: "Incorrect input" })
        })    
    }

    function generateJwtToken(json, privateKey) {
        return new Promise((resolve, reject) => {
            // generate user token
            var jwtToken = jwt.sign(json, privateKey)
            resolve(jwtToken)
        })
    }

    async function complexItemToItem<T,S,U>(action,item, data1, T, data2, S, U, attr1, attr2) : Promise<U> {
        // check whether resources exists
        let promises = [
            alreadyExist(data1, T),
            alreadyExist(data2, S)
        ]

        let result = await Promise.all(promises).catch((e) => { throw e })
        // fill foreign key references
        item[attr1] = result[0]
        item[attr2] = result[1]

        // perform add or remove
        if (action == "add") {
            let save = await conn.manager.save(item).catch((e) => {throw e })
            return save
        } else if (action == "rem") {
            let remove = await conn.manager.remove(item).catch((e) => {throw e })
            return remove
        }  
    }

    // OK
    async function handleArrayData(action, T, id, U, arr, attr1, attr2, relations) {
        let result = await conn.getRepository(T).findOne({ where: { id: id }, relations: relations })
        if (!result) throw { error: "The item is not registerd" }
        let newObj = await getAndCreate(attr2, U)
        if (action == "add") {
            result[arr].push(newObj)
            let save = await conn.manager.save(result).catch((e) => { throw e })
        } else if (action == "rem") {
            result[arr] = result[arr].filter((element) => {
                return element.name != newObj[attr1]
            })
            let save = await conn.manager.save(result).catch((e) => { throw e })
        }
        return result
    }

    async function complexItem<T,S,U>(action, data1, T, data2, S, U, attr1, attr2) : Promise<U> {

        // check whether resources exists
        let promises = [
            alreadyExist(data1, T),
            alreadyExist(data2, S)
        ]

        let result = await Promise.all(promises).catch((e) => { throw e })
        var newObj = new U()
        // fill foreign key references
        newObj[attr1] = result[0]
        newObj[attr2] = result[1]

        // perform add or remove
        if (action == "add") {
            let save = await conn.manager.save(newObj).catch((e) => {throw e })
            return newObj
        } else if (action == "rem") {
            let remove = await conn.manager.remove(newObj).catch((e) => {throw e })
            return newObj
        }  
    }

    function isA(el, res) {
        return (typeof el == res)
    }

    return {createSimpleEntityValue, facebookAuth, getEventsOwnedByUser, getLocationWithPeopleGenreAndInstrument, getLocationsWithEventAndGenre, getLocationPeopleGenre, createAnnounce, getUsersGivenInstrumentAndGenreAndLocation, getUsersGivenInstrumentAndLocation, getUsersGivenGenreAndLocation, getUsersInLocation, handleUserInstruments, getUserInstruments, handleUserGenres, getUserGenres, createEvent, createBand, get, createUser, getEntityValues, verifyUser, generateJwtToken, getFacebookInfo, isA, addItem, getAndCreate, complexItem, treatError}
}

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

    async function getAndCreateMany<T>(arr, T) : Promise<T[]>{
        const promiseArray:T[] = arr.map(element => getAndCreate<T>(element, T))
        const result = await Promise.all(promiseArray).catch((e) => { throw e })
        return result
    }

    async function getAndCreate<T>(data: object, T) : Promise<T> {

            console.log('getAndCreate')
            data = removeObjects(data)
            let got = await conn.getRepository(T).findOne(data).catch((e) => { throw e })
            if (got) return got
            else {
                let additem = await addItem(data, T).catch((e) => { throw e })
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
        Object.keys(obj).forEach(key => {
          if (isA(obj[key], 'object')) {
            delete obj[key]
          }
        })
        return obj
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

        // check whether band is not already registered
        let check = await conn.getRepository(Band).findOne(removeObjects(band))
        if (check) throw { error: "Band already registered" }

        // create all the entities independently
        let promises : [Promise<Genre[]>, Promise<Location>, Promise<Band>] = [
            getAndCreateMany(band.genre, Genre),
            getAndCreate(band.location, Location),
            getAndCreate(band, Band)
        ]

        // execute calls in sequence
        let result = await Promise.all(promises).catch((e) => { console.log(e); throw e })

        // fill foreign key references
        result[2].genre = [].concat(...result[0])
        result[2].place = result[1]

        console.log(result[2])

        // update entity row
        let save = await conn.manager.save(result[2]).catch((e) => { throw e })
        return result[2]
    }

    async function createAnnounce(params) {

        // create all the entities independently
        let promises : [Promise<User>, Promise<Location>, Promise<Announce>] = [
            getAndCreate(params.announce.owner, User),
            getAndCreate(params.announce.location, Location),
            getAndCreate(params.announce, Announce)
        ]

        let result = await Promise.all(promises).catch((e) => { throw e })
        
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

    async function getUserInstruments(uid) {
        if (!isA(uid, "string")) throw { error: "Invalid id" }
        let id = parseInt(uid)
        
        let promises : [Promise<User>, Promise<Instrument>] = [
            alreadyExist({ id: uid }, User),
            conn.getRepository("Instrument")
                .createQueryBuilder("instrument")
                .innerJoinAndSelect("ability", "ability", "ability.instrumentId = instrument.id")
                .innerJoinAndSelect("user", "user", "ability.userId = user.id")
                .where({ "userId" : id })
                .getMany()
            ]
        let result = Promise.all(promises).catch((e) => { throw e })
        return result[1]
    }

    async function getUsersInLocation(lid) {
        if (typeof (lid) != "string") throw { error: "Invalid id" }
        let id = parseInt(lid)

        let promises : [Promise<User>, Promise<Genre[]>] = [
            alreadyExist({ id: id }, Location),
            conn.getRepository("User")
                .createQueryBuilder("user")
                .innerJoinAndSelect("location", "location", "user.place = location.id")
                .where("placeId = :id")
                .setParameter("id", id)
                .getMany()
            ]
        let result = await Promise.all(promises).catch((e) => { throw e })
        return result[1]
    }

    async function getUserGenres(uid) {
        let id = parseInt(uid)

        let promises : [Promise<User>, Promise<Genre[]>] = [
            alreadyExist({ id: uid }, User),
            conn.getRepository("Genre")
                .createQueryBuilder("genre")
                .innerJoinAndSelect("preference", "pref", "genre.id = pref.genreId")
                .innerJoinAndSelect("user", "user", "user.id = pref.userId")
                .where({ "userId" : id })
                .getMany()
            ]
        let result = await Promise.all(promises).catch((e) => { throw e })
        return result[1]
    }

    async function getUsersGivenGenreAndLocation(params) {
        if (isA(params.id, "string") || isA(params.gid, "string")) throw { error: "Invalid id" }
        let id = parseInt(params.id)
        let gid = parseInt(params.gid)

        let promises = [
            alreadyExist({ id: id }, Location),
            alreadyExist({ id: gid }, Genre),
            conn.getRepository("User")
                .createQueryBuilder("user")
                .innerJoinAndSelect("location", "location", "user.place = location.id")
                .where("placeId = :id")
                .setParameter("id", id)
                .getMany()
            ]
        let result = await Promise.all(promises).catch((e) => { throw e })
        return result[2]
    }

    async function getUsersGivenInstrumentAndLocation(params) {
        if (!isA(params.id, "string") ||
            !isA(params.iid, "string")) throw { error: "Invalid id" }
        
        let id = parseInt(params.id)
        let iid = parseInt(params.iid)
        
        let promises = [
            alreadyExist({ id: id }, Location),
            alreadyExist({ id: iid }, Instrument),
            conn.getRepository("User")
                .createQueryBuilder("user")
                .innerJoinAndSelect("location", "location", "user.place = location.id")
                .innerJoinAndSelect("ability", "ability", "user.id = ability.user")
                .innerJoinAndSelect("instrument", "instrument", "instrument.id = ability.instrument")
                .where("placeId = :id AND instrumentId = :iid")
                .setParameters({ id: id, iid: iid })
                .getMany()
            ]
        let result = await Promise.all(promises).catch((e) => { throw e })
        return result[2]
    }

    async function getUsersGivenInstrumentAndGenreAndLocation(params) {
        if (isA(params.id, "string") ||
            isA(params.gid, "string") ||
            isA(params.iid, "string")) throw { error: "Invalid id" }
        
        let id = parseInt(params.id)
        let iid = parseInt(params.iid)
        let gid = parseInt(params.gid)

        let promises = [
            alreadyExist({ id: id }, Location),
            alreadyExist({ id: iid }, Instrument),
            alreadyExist({ id: gid }, Genre),
            conn.getRepository("User")
                .createQueryBuilder("user")
                .innerJoinAndSelect("location", "location", "user.place = location.id")
                .innerJoinAndSelect("preference", "preference", "user.id = preference.user")
                .innerJoinAndSelect("genre", "genre", "genre.id = preference.genre")
                .innerJoinAndSelect("ability", "ability", "user.id = ability.user")
                .innerJoinAndSelect("instrument", "instrument", "instrument.id = ability.instrument")
                .where("placeId = :id AND instrumentId = :iid AND genreId = :gid")
                .setParameters({ id: id, iid: iid, gid: gid })
                .getMany()
            ]
        let result = await Promise.all(promises).catch((e) => { throw e })
        return result[3]
    }

    async function getLocationPeopleGenre(id) {

        if (!(isA(id, "string"))) Promise.reject({ error: "Invalid id" })
        let gid = parseInt(id)
        
        let promises = [
            alreadyExist({ id: gid }, Genre),
            conn.getRepository("Location")
                .createQueryBuilder("location")
                .innerJoinAndSelect("user", "user", "user.place = location.id")
                .innerJoinAndSelect("preference", "preference", "preference.user = user.id")
                .innerJoinAndSelect("genre", "genre", "genre.id = preference.genre")
                .where("genreId = :id")
                .setParameter("id", gid)
                .getMany()
        ]
        let result = await Promise.all(promises).catch((e) => { throw e })
        return result[1]
    }

    async function getLocationWithPeopleGenreAndInstrument(params) {
        if (isA(params.gid, "string") ||
            isA(params.iid, "string")) Promise.reject({ error: "Invalid id" })

        let gid = parseInt(params.gid)
        let iid = parseInt(params.iid)

        let promises = [
            alreadyExist({ id: gid }, Genre),
            alreadyExist({ id: iid }, Instrument),
            conn.getRepository("Location")
                .createQueryBuilder("location")
                .innerJoinAndSelect("user", "user", "user.place = location.id")
                .innerJoinAndSelect("preference", "preference", "preference.user = user.id")
                .innerJoinAndSelect("genre", "genre", "genre.id = preference.genre")
                .innerJoinAndSelect("ability", "ability", "ability.user = user.id")
                .innerJoinAndSelect("instrument", "instrument", "instrument.id = ability.instrument")
                .where("genreId = :gid AND instrumentId = :iid")
                .setParameters({ gid: gid, iid: iid })
                .getMany()
        ]
        let result = Promise.all(promises).catch((e) => { throw e })
        return result[1]
    }

    async function getLocationsWithEventAndGenre(id) {
        if (!isA(id, "string")) throw{ error: "Invalid id" }
        let gid = parseInt(id)

        let promises = [
            alreadyExist({ id: gid }, Genre),
            conn.getRepository("Location")
                .createQueryBuilder("location")
                .innerJoinAndSelect("user", "user", "user.place = location.id")
                .innerJoinAndSelect("preference", "preference", "preference.user = user.id")
                .innerJoinAndSelect("genre", "genre", "genre.id = preference.genre")
                .where("genreId = :id")
                .setParameter("id", gid)
                .getMany()
        ]
        let result = await Promise.all(promises).catch((e) => { throw e })
        return result[2]
    }

    async function getEventsOwnedByUser(uid) {
        if (!uid) return Promise.reject({ error: "Error in the input" })
        var id = parseInt(uid)
        let promises = [
            alreadyExist({ id: id }, User),
            conn.getRepository("Event")
                .createQueryBuilder("event")
                .innerJoinAndSelect("user", "user", "event.owner = user.id")
                .where("ownerId = :id")
                .setParameter("id", id)
                .getMany()
        ]
        let result = await Promise.all(promises).catch((e) => { throw e })
        return result[1]
    }

    async function handleUserInstruments(params) {
        if (!params.body.action || !isA(params.params.user, "string") || !isA(params.body.instrument, "object")) {
            return Promise.reject({ error: "Error while deciding the action" })
        }
        if (params.body.action != "add" && params.body.action != "rem") {
            return Promise.reject({ error: "Invalid action" })
        }
        let result = await complexItem(params.body.action, { id: params.params.user }, User, params.body.instrument,
            Instrument, Ability, "user", "instrument").catch((e) => { throw e })
        return result           
    }

    async function handleUserGenres(params) {
        if (!params.body.action || !isA(params.params.user, "string") || !isA(params.body.genre, "object")) {
            return Promise.reject({ error: "Error while deciding the action" })
        }
        if (params.body.action != "add" && params.body.action != "rem") {
            return Promise.reject({ error: "Invalid action" })
        }
        let result = await complexItem(params.body.action, { id: params.params.user }, User, params.body.genre,
            Genre, Preference, "user", "genre").catch((e) => { throw e })
        return result          
    }

    async function getEntityValues<T>(filter, T) : Promise<T> {
        // filter the entity values 
        let result : T = await conn.getRepository(T).find(filter).catch((e) => { throw e })
        return result
    }

    async function createUser(user) : Promise<User> {
        // input check
        if (!isA(user, "object")) throw { error: "Malformed input" }
        if (!isA(user.place, "object")) throw { error: "Malformed input" }

        // check whether user is not already registered
        let check = await conn.getRepository(User).findOne(user).catch((e) => { throw { error: "User already registered" }})

        // create all the entities independently
        let promises : [Promise<Location>, Promise<User>] = [
            getAndCreate(user.place, Location),
            getAndCreate(user, User)
        ]

        let result = await Promise.all(promises).catch((e) => { throw e })
        // fill foreign key references
        result[1].place = result[0]

        // update entity row
        let save = await conn.getRepository(User).save(result[1])
        return result[1]
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
            return save
        } else if (action == "rem") {
            let remove = await conn.manager.remove(newObj).catch((e) => {throw e })
            return remove
        }  
    }

    function isA(el, res) {
        return (typeof el == res)
    }

    return {createSimpleEntityValue, facebookAuth, getEventsOwnedByUser, getLocationsWithEventAndGenre, createAnnounce, getUsersGivenInstrumentAndGenreAndLocation, getUsersGivenInstrumentAndLocation, getUsersGivenGenreAndLocation, getUsersInLocation, handleUserInstruments, getUserInstruments, handleUserGenres, getUserGenres, createEvent, createBand, get, createUser, getEntityValues, verifyUser, generateJwtToken, getFacebookInfo, isA, addItem, getAndCreate, complexItem, treatError}
}

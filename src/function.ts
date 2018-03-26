import {User} from "./entity/User"
import {Location} from "./entity/Location"
import {Instrument} from "./entity/Instrument"
import {Genre} from "./entity/Genre"
import {Preference } from "./entity/Preference"
import {Ability} from "./entity/Ability"
import {Announce} from "./entity/Announce"
import {Event} from "./entity/Event"
import {Band} from "./entity/Band"

module.exports = function(conn) {
    var axios = require('axios')
    var privateKey = require('./privatekey')
    var jwt = require('jsonwebtoken')
    var jwt_crypt = require('jsonwebtoken')

    var fb = "https://graph.facebook.com"

    async function addItem(data, objectClass) {
        return new Promise((resolve, reject) => {
            let obj = Object.assign(new objectClass, data)

            if (!(obj instanceof objectClass)) {
                reject({ error: "Error while parsing the input" })
            }

            conn.manager.save(obj)
                .then((result) => {
                    if (result) resolve(result)
                    else reject({ error: "Error while registering" })
                })
        })
    }

    async function getAndCreateMany<T>(arr, T) : Promise<Array<T>> {
        return new Promise<Array<T>>((resolve, reject) => {

            let promiseArray = []
            arr.forEach(element => {
                promiseArray.push(getAndCreate<T>(element, T))
            })

            Promise.all(promiseArray).then((result) => {
                resolve(result)
            }).catch((e) => reject(e))
            
        })
    }

    async function getAndCreate<T>(data: object, T) : Promise<T> {
        return new Promise<T>((resolve, reject) => {
            console.log('getAndCreate')
            data = removeObjects(data)
            conn.getRepository(T).findOne(data)
                .then((got:T) => {
                    if (got) {
                        resolve(got)
                    } else {
                        addItem(data, T)
                            .then((result:T) => {
                                resolve(result)
                            })
                            .catch((e) => {
                                reject(e)
                            })
                    }
                }).catch((e) => reject(e))
        })
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

    async function filterBy(filter, objectClass, res) {
        let ability = await conn.getRepository(objectClass).findOne(filter)
        res.send(ability)
    }

    async function get<T>(T, filter) : Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            getEntityValues(T, filter)
                .then((result:T[]) => resolve(result))
                .catch((e) => reject(e))
        })
    }

    async function prom(objClass) {
        return new Promise((resolve, reject) => {
            conn.getRepository(objClass).find()
            resolve(1)
        })
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
        return new Promise<Event>((resolve, reject) => {
            // input data check
            if (!isA(event.owner, "object")) reject({ error: "No owner selected" })
            if (!isA(event.location, "object")) reject({ error: "Location not found" })

            // check whether event is not already registered
            conn.getRepository(Event).findOne(event)
                .then((result) => reject({ error: "Event already registered" }))

            // create all the entities independently
            let promises : [Promise<User>, Promise<Location>, Promise<Event>] = [
                getAndCreate(event.owner, User),
                getAndCreate(event.location, Location),
                getAndCreate(event, Event)
            ]

            Promise.all(promises).then((values:any[]) => {
                // fill foreign key references
                values[2].owner = values[0]
                values[2].location = values[1]

                // update entity row
                conn.manager.save(values[2])
                    .then((result) => {
                        resolve(result)
                    }).catch((e) => reject(e))
            }, reason => {
                reject(reason)
            })
        })
    }

    async function createBand(band) : Promise<Band> {
        return new Promise<Band>((resolve, reject) => {
            // input data check
            if (!isA(band.genre, "object")) reject({ error: "No genres selected" })
            if (!isA(band.location, "object")) reject({ error: "Location not found" })

            // check whether band is not already registered
            conn.getRepository(Band).findOne(band)
                .then((result) => reject({ error: "Band already registered" }))

            // create all the entities independently
            let promises : [Promise<Genre[]>, Promise<Location>, Promise<Band>] = [
                getAndCreateMany(band.genre, Genre),
                getAndCreate(band.location, Location),
                getAndCreate(band, Band)
            ]

            Promise.all(promises).then((values:any[]) => {
                // fill foreign key references
                values[2].genre = values[0]
                values[2].place = values[1]

                // update entity row
                conn.manager.save(values[2])
                    .then((result) => {
                        resolve(result)
                    }).catch((e) => reject(e))
            }, reason => {
                reject(reason)
            })
        })
    }

    async function createAnnounce(params) {
        return new Promise((resolve, reject) => {

            // create all the entities independently
            let promises : [Promise<Announce>, Promise<User>, Promise<Location>] = [
                getAndCreate(params.announce.owner, User),
                getAndCreate(params.announce.location, Location),
                getAndCreate(params.announce, Announce)
            ]

            Promise.all(promises).then((values:any[]) => {
                // fill foreign key references
                values[2].owner = values[0]
                values[2].location = values[1]

                // update entity row
                conn.manager.save(values[2])
                    .then((result) => {
                        resolve(result)
                    }).catch((e) => reject(e))
            }, reason => {
                reject(reason)
            })
        })
    }

    async function alreadyExist<T>(data, T) : Promise<User> {
        return new Promise<User>((resolve, reject) => {
            conn.getRepository(T).find(data)
                .then((item) => {
                    if (!item) reject({ error: "Item does not exist" })
                    else resolve(item)
                })
        })
    }

    async function notExist<T>(data, T) : Promise<User> {
        return new Promise<User>((resolve, reject) => {
            conn.getRepository(T).find(data)
                .then((item) => {
                    if (item) reject({ error: "Item already exists" })
                    else resolve(item)
                })
        })
    }

    async function getUserInstruments(uid) {
        return new Promise((resolve, reject) => {
            if (!isA(uid, "string")) reject("Invalid id")
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
            Promise.all(promises).then((values) => {
                resolve(values[1])
            })
        })
    }

    async function getUsersInLocation(lid) {
        return new Promise((resolve, reject) => {
            if (typeof (lid) != "string") reject({ error: "Invalid id" })
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
            Promise.all(promises).then((values) => {
                resolve(values[1])
            })
        })
    }

    async function getUserGenres(uid) {
        return new Promise((resolve, reject) => {
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
            Promise.all(promises).then((values) => {
                resolve(values[1])
            })
        })    
    }

    async function getUsersGivenGenreAndLocation(params) {
        return new Promise((resolve, reject) => {
            if (isA(params.id, "string") || isA(params.gid, "string")) reject({ error: "Invalid id" })
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
            Promise.all(promises).then((values) => {
                resolve(values[2])
            })
        })
    }

    async function getUsersGivenInstrumentAndLocation(params) {
        return new Promise((resolve, reject) => {
            if (!isA(params.id, "string") ||
                !isA(params.iid, "string")) reject({ error: "Invalid id" })
            
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
            Promise.all(promises).then((values) => {
                resolve(values[2])
            })
        })
    }

    async function getUsersGivenInstrumentAndGenreAndLocation(params) {
        return new Promise((resolve, reject) => {
            if (isA(params.id, "string") ||
                isA(params.gid, "string") ||
                isA(params.iid, "string")) reject({ error: "Invalid id" })
            
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
            Promise.all(promises).then((values) => {
                resolve(values[3])
            })
        })
    }

    async function getLocationPeopleGenre(id) {
        return new Promise((resolve, reject) => {
            if (!(isA(id, "string"))) reject({ error: "Invalid id" })
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
            Promise.all(promises).then((values) => {
                resolve(values[1])
            })
        })          
    }

    async function getLocationWithPeopleGenreAndInstrument(params) {
        return new Promise((resolve, reject) => {
            if (isA(params.gid, "string") ||
                isA(params.iid, "string")) reject({ error: "Invalid id" })

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
            Promise.all(promises).then((values) => {
                resolve(values[1])
            })
        })
    }

    async function getLocationsWithEventAndGenre(id) {
        return new Promise((resolve, reject) => {
            if (!isA(id, "string")) reject({ error: "Invalid id" })
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
            Promise.all(promises).then((values) => {
                resolve(values[2])
            })
        })
    }

    async function getEventsOwnedByUser(uid) {
        return new Promise((resolve, reject) => {
            if (!uid) reject({ error: "Error in the input" })
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
            Promise.all(promises).then((values) => {
                resolve(values[1])
            })
        })
    }

    async function handleUserInstruments(params) {
        return new Promise((resolve, reject) => {
            if (!params.body.action || !isA(params.params.user, "string") || !isA(params.body.instrument, "object")) {
                reject({ error: "Error while deciding the action" })
            }
            if (params.body.action != "add" && params.body.action != "rem") {
                reject({ error: "Invalid action" })
            }
            complexItem(params.body.action, { id: params.params.user }, User, params.body.instrument,
                Instrument, Ability, "user", "instrument")
                .then((result) => {
                    resolve(result)
                })              
        })
    }

    async function handleUserGenres(params) {
        return new Promise((resolve, reject) => {
            if (!params.body.action || !isA(params.params.user, "string") || !isA(params.body.genre, "object")) {
                reject({ error: "Error while deciding the action" })
            }
            if (params.body.action != "add" && params.body.action != "rem") {
                reject({ error: "Invalid action" })
            }
            complexItem(params.body.action, { id: params.params.user }, User, params.body.genre,
                Genre, Preference, "user", "genre")
                .then((result) => {
                    resolve(result)
                })              
        })
    }

    async function getAnnounce(c, filter) : Promise<Announce[]> {
        return new Promise<Announce[]>((resolve, reject) => {
            // filter announces
            getEntityValues(c, filter)
                .then((result:Announce[]) => resolve(result))
                .catch((e) => reject(e))
        })
    }

    async function getEntityValues<T>(T, filter) {
        return new Promise((resolve, reject) => {
            // filter the entity values 
            conn.getRepository(T).find(filter)
                .then((result) => {
                    resolve(result)
                }).catch((e) => reject(treatError(e)))
                
        })
    }

    async function createUser(user) : Promise<User> {
        return new Promise<User>((resolve, reject) => {
            // input check
            if (!isA(user, "object")) reject({ error: "Malformed input" })
            if (!isA(user.place, "object")) reject({ error: "Malformed input" })

            // check whether user is not already registered
            conn.getRepository(User).findOne(user)
                .then((result) => {
                    if(result) reject({ error: "User already registered" })
                })

            // create all the entities independently
            let promises : [Promise<Location>, Promise<User>] = [
                getAndCreate(user.place, Location),
                getAndCreate(user, User)
            ]

            Promise.all(promises).then((values:any[]) => {
                // fill foreign key references
                values[1].place = values[0]

                // update entity row
                conn.getRepository(User).save(values[1])
                resolve(values[1])
            }, reason => {
                reject(reason)
            })
        })
    }

    async function createGenre(data) : Promise<Genre> {
        return new Promise<Genre>((resolve, reject) => {
            // input check
            if (!isA(data.genre, "object")) reject({ error: "Malformed input" })

            // create the genre if not exists
            getAndCreate(data.genre, Genre)
                .then((result:Genre) => {
                    resolve(result)
                })
        })
    }

    async function createInstrument(data) : Promise<Instrument> {
        return new Promise<Instrument>((resolve, reject) => {
            // input check
            if (!isA(data.instrument, "object")) reject({ error: "Malformed input" })

            // create the genre if not exists
            getAndCreate(data.instrument, Instrument)
                .then((result:Instrument) => {
                    resolve(result)
                })
        })
    }

    async function createLocation(data) : Promise<Location> {
        return new Promise<Location>((resolve, reject) => {
            // input check
            if (!isA(data.location, "object")) reject({ error: "Malformed input" })

            // create the location if not exists
            getAndCreate(data.location, Location)
                .then((result:Location) => {
                    resolve(result)
                })
        })
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
        return new Promise<U>((resolve, reject) => {

            // check whether resources exists
            let promises = [
                alreadyExist(data1, T),
                alreadyExist(data2, S)
            ]

            Promise.all(promises).then((values) => {
                // fill foreign key references
                item[attr1] = values[0]
                item[attr2] = values[1]

                // perform add or remove
                if (action == "add") {
                    conn.manager.save(item)
                        .then((result) => {
                            resolve(item)
                        })
                } else if (action == "rem") {
                    conn.manager.remove(item)
                        .then((result) => {
                            resolve(item)
                        })
                }
            })    
        })
    }

    async function complexItem<T,S,U>(action, data1, T, data2, S, U, attr1, attr2) : Promise<U> {
        return new Promise<U>((resolve, reject) => {

            // check whether resources exists
            let promises = [
                alreadyExist(data1, T),
                alreadyExist(data2, S)
            ]

            Promise.all(promises).then((values) => {
                var newObj = new U()
                // fill foreign key references
                newObj[attr1] = values[0]
                newObj[attr2] = values[1]

                // perform add or remove
                if (action == "add") {
                    conn.manager.save(newObj)
                        .then((result) => {
                            resolve(newObj)
                        })
                } else if (action == "rem") {
                    conn.manager.remove(newObj)
                        .then((result) => {
                            resolve(newObj)
                        })
                }
            })    
        })
    }

    function isA(el, res) {
        return (typeof el == res)
    }

    return {facebookAuth, getEventsOwnedByUser, createInstrument, createGenre, getLocationsWithEventAndGenre, createAnnounce, createLocation, getUsersGivenInstrumentAndGenreAndLocation, getUsersGivenInstrumentAndLocation, getUsersGivenGenreAndLocation, getUsersInLocation, handleUserInstruments, getUserInstruments, handleUserGenres, getUserGenres, createEvent, createBand, getAnnounce, get, createUser, getEntityValues, verifyUser, generateJwtToken, getFacebookInfo, isA, addItem, filterBy, getAndCreate, complexItem, treatError}
}
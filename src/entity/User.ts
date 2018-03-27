import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable} from "typeorm";
import {Location} from './Location'
import {Genre} from './Genre'
import {Instrument} from './Instrument'

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ nullable: false })
    firstname: string

    @Column({ nullable: false })
    lastname: string

    @Column()
    facebook: string

    @Column()
    google: string

    @Column({ select: false })
    username: string

    @Column({ select: false })
    password: string

    @Column({ type: 'date' })
    born_date: string

    @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
    register_date: string

    @Column({ type: 'datetime' })
    last_visit: string

    @ManyToOne((type) => Location, (group) => group.name, {cascadeInsert:true, cascadeUpdate:true})
    place: Location

    @ManyToMany(type => Genre)
    @JoinTable()
    genre: Genre[]

    @ManyToMany(type => Instrument)
    @JoinTable()
    instrument: Instrument[]
}

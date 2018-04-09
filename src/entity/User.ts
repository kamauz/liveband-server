import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToOne, JoinColumn, OneToMany} from "typeorm";
import {Location} from './Location'
import {Genre} from './Genre'
import {Instrument} from './Instrument'
import {Setting} from './Setting'

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ nullable: false })
    firstname: string

    @Column({ nullable: false })
    lastname: string

    @Column({ nullable: true })
    facebook: string

    @Column({ nullable: true })
    google: string

    @Column({ nullable: true, select: false })
    username: string

    @Column({ nullable: true, select: false })
    password: string

    @Column({ nullable: true, type: 'date' })
    born_date: string

    @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
    register_date: string

    @Column({ nullable: true, type: 'datetime' })
    last_visit: string

    @ManyToOne((type) => Location, (group) => group.name)
    place: Location

    @ManyToMany(type => Genre)
    @JoinTable()
    genre: Genre[]

    @ManyToMany(type => Instrument)
    @JoinTable()
    instrument: Instrument[]

}

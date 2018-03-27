import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable} from "typeorm";
import {Location} from './Location'
import {Genre} from './Genre'
import {User} from './User'

@Entity()
export class Band {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ nullable: false })
    name: string

    @Column({ type: 'date' })
    born_date: string

    @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
    register_date: string

    @ManyToMany(type => Genre)
    @JoinTable()
    genre: Genre[]

    @ManyToMany(type => User)
    @JoinTable()
    user: User[]

    @ManyToOne((type) => Location, (group) => group.name)
    place: Location
}

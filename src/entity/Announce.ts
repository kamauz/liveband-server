import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm";
import {Location} from './Location'
import {User} from './User'


@Entity()
export class Announce {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    description: string

    @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
    published_date: string

    @ManyToOne((type) => Location, (group) => group.id)
    location: Location

    @ManyToOne((type) => User, (group) => group.id)
    owner: User
}

import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, PrimaryColumn} from "typeorm";
import {Location} from './Location'
import {User} from './User'
import {Genre} from './Genre'

@Entity()
export class Preference {

    @ManyToOne((type) => User, (group) => group.id, { primary: true })
    user: User

    @ManyToOne((type) => Genre, (group) => group.id, { primary: true })
    genre: Genre

    @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
    declared_date: string

}

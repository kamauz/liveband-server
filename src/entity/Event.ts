import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable} from "typeorm";
import {Location} from './Location'
import {User} from './User'
import {Band} from './Band'


@Entity()
export class Event {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    description: string

    @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
    published_date: string

    @Column({ type: 'datetime', nullable: false })
    start_time: string

    @Column({ type: 'datetime', nullable: false })
    end_time: string

    @ManyToOne((type) => Location, (group) => group.id, {cascadeInsert:true, cascadeUpdate:true})
    location: Location

    @ManyToOne((type) => User, (group) => group.id )
    owner: User

    @ManyToMany(type => Band)
    @JoinTable()
    bands: Band[]

    @Column()
    facebookid: string
}

import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm";
import {Location} from './Location'

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
}

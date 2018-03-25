import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, PrimaryColumn} from "typeorm";
import {Location} from './Location'
import {User} from './User'
import {Instrument} from './Instrument'

@Entity()
export class Ability {

    @ManyToOne((type) => User, (group) => group.id, { primary: true })
    user: User

    @ManyToOne((type) => Instrument, (group) => group.name, { primary: true })
    instrument: Instrument

    @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
    declared_date: string

}

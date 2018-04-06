import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne} from "typeorm";
import {User} from './User'

@Entity()
export class SettingValue {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true, nullable: false })
    key: string

    @Column({ nullable: false })
    value: string
}

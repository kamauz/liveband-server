import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn} from "typeorm";
import {User} from './User'

@Entity()
export class Setting {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ nullable: false })
    key: string

    @Column({ nullable: false })
    value: string

}

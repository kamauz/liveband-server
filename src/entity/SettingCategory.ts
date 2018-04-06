import {Entity, ManyToOne, JoinTable, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, ManyToMany} from "typeorm";
import {User} from './User'
import {SettingValue} from './SettingValue'

@Entity()
export class SettingCategory {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true, nullable: false })
    key: string

    @ManyToMany(type => SettingValue)
    @JoinTable()
    setting: SettingValue[]
}

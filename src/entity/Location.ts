import {Entity, Index, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Location {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: false })
    name: string

    @Column({ unique: false })
    city: string

    @Column({ unique: false })
    province: string

    @Column({ unique: false })
    nation: string

    @Column({ unique: false, type: "float" })
    latitude: number

    @Column({ unique: false, type: "float" })
    longitude: number
}

import {Entity, Index, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
@Index("index_location", (location: Location) => [location.name, location.city, location.province, location.nation], {unique: true})
export class Location {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    city: string

    @Column()
    province: string

    @Column()
    nation: string

    @Column({ type: "float" })
    latitude: number

    @Column({ type: "float" })
    longitude: number
}

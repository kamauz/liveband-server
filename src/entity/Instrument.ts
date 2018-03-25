import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Instrument {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true, nullable: false })
    name: string

    @Column({ type: 'datetime', default: () => "CURRENT_TIMESTAMP" })
    inserted_date: string
}

import {EPronouns} from "./User";

class Prefrences{
    private userID: number;
    private age: Date = new Date(1900,1,1);    // Unix Epoch: 1 January 1970
    private gender: EPronouns = EPronouns.notset;
    private minGreen: number = 0;

    public constructor(userID: number) {
        this.userID = userID;
    }

    public getUserID(userID: number){
        return this.gender;
    }

    public setAge(age: Date){
        this.age = age;
    }

    public getAge(){
        return this.age;
    }

    public setGender(gender: EPronouns){
        this.gender=gender;
    }

    public getGender(){
        return this.gender;
    }

    public setMinGreen(minGreen: number){
        this.minGreen=minGreen;
    }

    public getMinGreen(){
        return this.minGreen;
    }
}
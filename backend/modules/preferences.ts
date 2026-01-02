export enum EGender {
  male = 'male',
  female = 'female',
  other = 'other',
  hidden = 'hidden'
}

export class Preferences {
  private userid: number;
  private age: number | null;
  private gender: EGender | null;
  private minGreen: number | null;

  constructor(
    userid: number,
    age: number | null = null,
    gender: EGender | null = null,
    minGreen: number | null = null
  ) {
    this.userid = userid;
    this.age = age;
    this.gender = gender;
    this.minGreen = minGreen;
  }

  /*
    private helper method to calculate age from date of birth (provided from user object)

    IMPLEMENT FOR BUDDY POOL!, calc daily after moodlog

    private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
    */

  public getUserId(): number {
    return this.userid;
  }

  public setAge(age: number | null): void {
    this.age = age;
  }

  public getAge(): number | null {
    return this.age;
  }

  public setGender(gender: EGender | null): void {
    this.gender = gender;
  }

  public getGender(): EGender | null {
    return this.gender;
  }

  public setMinGreen(minGreen: number | null): void {
    this.minGreen = minGreen;
  }

  public getMinGreen(): number | null {
    return this.minGreen;
  }
}
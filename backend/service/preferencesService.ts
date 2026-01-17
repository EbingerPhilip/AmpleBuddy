import { preferencesRepository } from "../repository/preferencesRepository";
import { userRepository } from "../repository/userRepository";
import { EGender, Preferences } from "../modules/preferences";

class PreferencesService {

  async createPreferences(
    userId: number,
    gender: EGender | null,
    minGreen: number | null,
    age: number | null,
    ageMin: number | null,
    ageMax: number | null,
  ): Promise<void> {
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("User not found");
    const pref = new Preferences(userId, age, gender, minGreen);
      await preferencesRepository.createPreferences({
      userid: pref.getUserId(),
      age: pref.getAge(),
      gender: pref.getGender(),
      minGreen: pref.getMinGreen(),
      // @ts-ignore
      ageMin: ageMin ?? null,
      ageMax: ageMax ?? null,

    });
  }

  async getPreferences(userId: number): Promise<any | null> {
    return preferencesRepository.getPreferencesByUserId(userId);
  }

    async updatePreferences(
        userId: number,
        gender: EGender | null,
        minGreen: number | null,
        age: number | null,
        ageMin: number | null,
        ageMax: number | null,
    ): Promise<void> {
        const user = await userRepository.getUserById(userId);
        if (!user) throw new Error("User not found");

        const existing = await preferencesRepository.getPreferencesByUserId(userId);

        // If no row exists yet, create it (upsert behaviour)
        if (!existing) {
            await this.createPreferences(userId, gender, minGreen, age, ageMin, ageMax);
            return;
        }

        await preferencesRepository.updatePreferences(userId, {
            age: age ?? null,
            gender: gender ?? null,
            minGreen: minGreen ?? null,
            ageMin: ageMin ?? null,
            ageMax: ageMax ?? null,
        });
    }

}

export const preferencesService = new PreferencesService();
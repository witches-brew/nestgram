import { CustomGetter, IStateInfo } from '../../types/state.types';

export class StateStore<T = any> {
  protected states: IStateInfo<T>[] = [];

  /**
   * If you want to set a custom getter, use .setCustomGetter method
   * */
  private customGetter: CustomGetter;

  /**
   * If you set a custom getter, when the user wants to get the store, he will ask your method
   * @param customGetter Custom getter you want to save. Your getter can take user id and params from the handler as arguments. Getter must return object (state)
   * */
  setCustomGetter(customGetter: CustomGetter): true {
    this.customGetter = customGetter;
    return true;
  }

  async getStore(userId: number, params?: any): Promise<T> {
    if (this.customGetter) {
      let result: T;

      try {
        result = await this.customGetter(userId, params);
      } catch (e: any) {
        result = this.customGetter(userId, params);
      }

      return result;
    }

    let state: IStateInfo<T> | undefined = this.states.find(
      (stateInfo: IStateInfo<T>): boolean => stateInfo.userId === userId,
    );

    if (!state) {
      state = { userId, state: {} as T };
      this.states.push(state);
    }

    return state.state;
  }
}

export const stateStore: StateStore = new StateStore();

export abstract class BaseRegistry<T = unknown> {
  protected isFrozen = false;
  private _version = 0;

  get version(): number {
    return this._version;
  }

  protected incrementVersion(): void {
    this._version++;
  }

  freeze(): void {
    this.isFrozen = true;
  }

  protected assertNotFrozen(): void {
    if (this.isFrozen) {
      throw new Error('Registry is frozen: Modifications are not allowed after boot.');
    }
  }

  /**
   * Returns a deep, read-only copy of the registry's internal state.
   */
  abstract snapshot(): T;
}

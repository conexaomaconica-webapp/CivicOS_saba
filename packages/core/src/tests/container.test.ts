// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../di/container';
import { createToken } from '../di/tokens';

describe('Dependency Injection Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should register and resolve a singleton instance', () => {
    class DummyService {
      value = 42;
    }
    const token = createToken<DummyService>('DummyService');
    const instance = new DummyService();

    container.register(token, instance);
    const resolved = container.resolve(token);

    expect(resolved).toBe(instance);
    expect(resolved.value).toBe(42);
  });

  it('should throw when resolving an unregistered token', () => {
    const token = createToken<{ foo: string }>('UnregisteredToken');
    expect(() => container.resolve(token)).toThrow(/Failed to resolve token: "UnregisteredToken"/);
  });

  it('should throw when registering a token twice', () => {
    const token = createToken<string>('MyString');
    container.register(token, 'first');
    expect(() => container.register(token, 'second')).toThrow(/is already registered/);
  });

  it('should clear all registrations', () => {
    const token = createToken<string>('MyString');
    container.register(token, 'value');
    container.clear();
    expect(() => container.resolve(token)).toThrowError();
  });
});

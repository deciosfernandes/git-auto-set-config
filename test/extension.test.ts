import * as assert from 'assert';
import {
    generateGitConfigKey,
    isRootInIgnoreList,
    addRootToIgnoreList,
    removeRootFromIgnoreList,
    getConfigList,
    GitConfig
} from '../src/config/config';

suite("generateGitConfigKey", () => {
    test("includes email and name", () => {
        const config: GitConfig = { "user.email": "tom@riddle.com", "user.name": "Tom Riddle" };
        const key = generateGitConfigKey(config);
        assert.ok(key.includes("tom@riddle.com"));
        assert.ok(key.includes("Tom Riddle"));
    });

    test("includes extra keys", () => {
        const config: GitConfig = { "user.email": "a@b.com", "user.name": "A", "core.autocrlf": "true" };
        const key = generateGitConfigKey(config);
        assert.ok(key.includes("core.autocrlf=true"));
    });

    test("produces different keys for different extra key values", () => {
        const config1: GitConfig = { "user.email": "a@b.com", "user.name": "A", "core.autocrlf": "true" };
        const config2: GitConfig = { "user.email": "a@b.com", "user.name": "A", "core.autocrlf": "false" };
        assert.notEqual(generateGitConfigKey(config1), generateGitConfigKey(config2));
    });

    test("produces different keys for same email/name but different extra keys", () => {
        const config1: GitConfig = { "user.email": "a@b.com", "user.name": "A", "core.autocrlf": "true" };
        const config2: GitConfig = { "user.email": "a@b.com", "user.name": "A" };
        assert.notEqual(generateGitConfigKey(config1), generateGitConfigKey(config2));
    });

    test("is deterministic regardless of property insertion order", () => {
        const config1: GitConfig = { "user.email": "a@b.com", "user.name": "A", "core.autocrlf": "true" };
        const config2: GitConfig = { "core.autocrlf": "true", "user.name": "A", "user.email": "a@b.com" };
        assert.equal(generateGitConfigKey(config1), generateGitConfigKey(config2));
    });
});

suite("ignore list", () => {
    const testRoot = "/test/fake/repo/root";

    teardown(async () => {
        await removeRootFromIgnoreList(testRoot);
    });

    test("isRootInIgnoreList returns false for unknown root", () => {
        assert.equal(isRootInIgnoreList(testRoot), false);
    });

    test("addRootToIgnoreList makes isRootInIgnoreList return true", async () => {
        await addRootToIgnoreList(testRoot);
        assert.equal(isRootInIgnoreList(testRoot), true);
    });

    test("removeRootFromIgnoreList makes isRootInIgnoreList return false", async () => {
        await addRootToIgnoreList(testRoot);
        await removeRootFromIgnoreList(testRoot);
        assert.equal(isRootInIgnoreList(testRoot), false);
    });

    test("addRootToIgnoreList is idempotent", async () => {
        await addRootToIgnoreList(testRoot);
        await addRootToIgnoreList(testRoot);
        const count = (await Promise.resolve(getConfigList())).length; // just ensure no throw
        assert.equal(isRootInIgnoreList(testRoot), true);
    });
});

suite("getConfigList", () => {
    test("returns an array", () => {
        const list = getConfigList();
        assert.ok(Array.isArray(list));
    });
});

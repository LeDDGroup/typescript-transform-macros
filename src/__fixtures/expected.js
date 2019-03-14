function demo() {
    const __input4 = [1, 2, 3, 4];
    const __length4 = __input4.length;
    const __result4 = new Array(__length4);
    for (let __i4 = 0; __i4 < __length4; __i4++) {
        __result4[__i4] =
            __input4[__i4]
                + 1;
    }
    const __input2 = __result4;
    const __length2 = __input2.length;
    const __result2 = [];
    for (let __i2 = 0; __i2 < __length2; __i2++) {
        if (__input2[__i2]
            % 2 === 0)
            __result2.push(__input2[__i2]);
    }
    return __result2;
}

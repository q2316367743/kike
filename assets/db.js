/**
 * 获取全部待办
 * @returns {Promise<Todo>}
 */
export async function getAll() {
    /** @type {Todo} */
    const results = {};
    const allDocs = await utools.db.promises.allDocs('/todo/');
    for (let allDoc of allDocs) {
        const date = allDoc._id.replace('/todo/', '');
        results[date] = allDoc.value;
    }
    return results;
}

/**
 * 保存全部待办
 * @param todo {Todo} 待办
 * @returns {Promise<void>}
 */
export async function saveAll(todo) {
    // 删除全部旧的待办
    const allDocs = await utools.db.promises.allDocs('/todo/');
    for (let allDoc of allDocs) {
        await utools.db.promises.remove(allDoc);
    }
    // 新建新的
    for (let date in todo) {
        const items = todo[date];
        if (!Array.isArray(items)) {
            console.error("日期：", date, "待办列表不是数组")
            continue;
        }
        await saveDate(date, todo[date])
    }

}

/**
 * 保存一天的数据
 * @param date {string} 日期
 * @param items {Array<TodoItem>} 待办项
 * @returns {Promise<void>}
 */
export async function saveDate(date, items) {
    console.log(date, items)
    const key = `/todo/${date}`;
    // 查询旧的
    const docs = await utools.db.promises.get(key);
    // 保存新的
    await utools.db.promises.put({
        _id: key,
        value: items,
        _rev: docs?._rev
    });
}


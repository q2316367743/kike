/**
 * 一个待办项
 */
declare interface TodoItem {
  id: number;
  text: string;
  completed: boolean;

}

/**
 * 一个待办项
 */
declare interface TodoItemWrap extends TodoItem{
  id: number;
  text: string;
  completed: boolean;

  // ------------------------------------ 下面不在数据中 ------------------------------------

  // 是否在编辑中
  editing?: boolean;
  // 删除确认
  deleteConfirmed?: boolean;
}

/**
 * 待办数据
 */
declare type Todo = Record<string, Array<TodoItemWrap>>

declare interface TodoItemDrag extends TodoItem {
  sourceDate: string
}

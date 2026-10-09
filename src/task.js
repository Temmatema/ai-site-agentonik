import { createContext, useContext } from 'react';

// Текст задачи для формы заявки: его подставляют демо, калькулятор, кейсы и FAQ.
export const TaskCtx = createContext(null);
export const useTask = () => useContext(TaskCtx);

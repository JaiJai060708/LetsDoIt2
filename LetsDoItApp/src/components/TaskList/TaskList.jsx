import { Droppable } from '@hello-pangea/dnd';
import Task from '../Task';
import styles from './TaskList.module.css';

function TaskList({ 
  droppableId,
  tasks, 
  onUpdate, 
  onSelectTask, 
  selectedTask, 
  compact = false,
  emptyMessage = 'No tasks'
}) {
  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`${styles.taskList} ${compact ? styles.compact : ''} ${snapshot.isDraggingOver ? styles.draggingOver : ''}`}
        >
          {tasks.length === 0 && !snapshot.isDraggingOver && (
            <div className={styles.empty}>
              {emptyMessage}
            </div>
          )}
          {tasks.map((task, index) => (
            <Task
              key={task.id}
              task={task}
              index={index}
              onUpdate={onUpdate}
              onSelect={onSelectTask}
              isSelected={selectedTask?.id === task.id}
              compact={compact}
            />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default TaskList;

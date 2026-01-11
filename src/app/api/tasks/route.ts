import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { nanoid } from 'nanoid';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { TaskStatus } from '@/types';

// GET /api/tasks - List tasks
// Query params:
//   ?projectId=xxx - Single project (backward compat)
//   ?projectIds=id1,id2,id3 - Multiple projects
//   No params - All tasks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const projectIds = searchParams.get('projectIds');

    let tasks;

    if (projectIds) {
      // Multi-project mode
      const ids = projectIds.split(',').filter(Boolean);
      if (ids.length > 0) {
        tasks = await db
          .select()
          .from(schema.tasks)
          .where(inArray(schema.tasks.projectId, ids))
          .orderBy(schema.tasks.status, schema.tasks.position);
      } else {
        // Empty filter = all tasks
        tasks = await db
          .select()
          .from(schema.tasks)
          .orderBy(schema.tasks.status, schema.tasks.position);
      }
    } else if (projectId) {
      // Single project mode (backward compat)
      tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.projectId, projectId))
        .orderBy(schema.tasks.status, schema.tasks.position);
    } else {
      // No filter - return all tasks
      tasks = await db
        .select()
        .from(schema.tasks)
        .orderBy(schema.tasks.status, schema.tasks.position);
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task or update existing if title matches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, title, description, status } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'projectId and title are required' },
        { status: 400 }
      );
    }

    // Check if task with same title already exists in this project
    const existingTasks = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.projectId, projectId),
          eq(schema.tasks.title, title)
        )
      )
      .limit(1);

    // If existing task found, update its description
    if (existingTasks.length > 0) {
      const existingTask = existingTasks[0];
      const updatedTask = {
        ...existingTask,
        description: description || null,
        updatedAt: Date.now(),
      };

      await db
        .update(schema.tasks)
        .set({ description: updatedTask.description, updatedAt: updatedTask.updatedAt })
        .where(eq(schema.tasks.id, existingTask.id));

      return NextResponse.json({ ...updatedTask, updated: true }, { status: 200 });
    }

    // Validate status if provided
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
    const taskStatus: TaskStatus = status && validStatuses.includes(status) ? status : 'todo';

    // Get the highest position for this status in this project
    const tasksInStatus = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.projectId, projectId),
          eq(schema.tasks.status, taskStatus)
        )
      )
      .orderBy(desc(schema.tasks.position))
      .limit(1);

    const position = tasksInStatus.length > 0 ? tasksInStatus[0].position + 1 : 0;

    const newTask = {
      id: nanoid(),
      projectId,
      title,
      description: description || null,
      status: taskStatus,
      position,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.insert(schema.tasks).values(newTask);

    return NextResponse.json({ ...newTask, updated: false }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create task:', error);

    // Handle foreign key constraint (invalid projectId)
    if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

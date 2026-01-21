import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { nanoid } from 'nanoid';
import { eq, and, desc } from 'drizzle-orm';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

// POST /api/attempts - Create a new attempt (only creates record)
// Actual execution happens via WebSocket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      taskId,
      prompt,
      force_create,
      projectId,
      projectName,
      taskTitle,
      projectRootPath
    } = body;

    console.log('POST /api/attempts received:', {
      taskId,
      prompt,
      force_create,
      projectId,
      projectName,
      taskTitle,
      projectRootPath
    });

    if (!taskId || !prompt) {
      return NextResponse.json(
        { error: 'taskId and prompt are required' },
        { status: 400 }
      );
    }

    // Step 1: If force_create is not true, skip validation and create attempt directly
    if (!force_create) {
      // Validate task exists (current behavior)
      const task = await db.query.tasks.findFirst({
        where: eq(schema.tasks.id, taskId)
      });

      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      // Create attempt with existing task
      return await createAttempt(task, prompt);
    }

    // Step 2: Check if taskId exists
    const existingTask = await db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId)
    });

    if (existingTask) {
      // Task exists, create attempt directly
      return await createAttempt(existingTask, prompt);
    }

    // Step 3: Task doesn't exist, need to validate and create
    // First, get the projectId from the request body
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      );
    }

    // Step 4: Check if projectId exists
    let existingProject;
    try {
      existingProject = await db.query.projects.findFirst({
        where: eq(schema.projects.id, projectId)
      });
    } catch (dbError) {
      console.error('Database error checking project:', dbError);
      return NextResponse.json(
        { error: 'Database error checking project' },
        { status: 500 }
      );
    }

    console.log('Project exists?', !!existingProject);

    let finalProjectId = projectId;

    if (!existingProject) {
      console.log('Project does not exist, checking projectName...');
      console.log('projectName value:', projectName);
      console.log('projectName type:', typeof projectName);
      console.log('projectName === undefined:', projectName === undefined);
      console.log('projectName === null:', projectName === null);
      console.log('projectName === "":', projectName === "");

      // Project doesn't exist, check if projectName provided
      if (!projectName || projectName.trim() === '') {
        console.log('Project name required but not provided');
        return NextResponse.json(
          { error: 'projectName required' },
          { status: 400 }
        );
      }

      // Determine project path based on projectRootPath
      const projectDirName = `${projectId}-${projectName}`;
      const projectPath = projectRootPath
        ? join(projectRootPath, projectDirName)
        : join(process.cwd(), 'data', 'projects', projectDirName);

      // Create the project folder
      try {
        await mkdir(projectPath, { recursive: true });
      } catch (mkdirError: any) {
        // If folder already exists, that's okay
        if (mkdirError?.code !== 'EEXIST') {
          console.error('Failed to create project folder:', mkdirError);
          return NextResponse.json(
            { error: 'Failed to create project folder: ' + mkdirError.message },
            { status: 500 }
          );
        }
      }

      // Create new project
      const newProject = {
        id: projectId,
        name: projectName,
        path: projectPath,
        createdAt: Date.now(),
      };

      try {
        await db.insert(schema.projects).values(newProject);
      } catch (error) {
        console.error('Failed to create project:', error);
        return NextResponse.json(
          { error: 'Failed to create project' },
          { status: 500 }
        );
      }
    }

    // Step 5: At this point, project exists (either was existing or was just created)
    // Check if taskTitle is provided
    if (!taskTitle || taskTitle.trim() === '') {
      console.log('Task title required but not provided');
      return NextResponse.json(
        { error: 'taskTitle required' },
        { status: 400 }
      );
    }

    // Create new task
    const newTask = await createNewTask(taskId, finalProjectId, taskTitle);

    if (!newTask) {
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    // Step 6: Create attempt with the newly created task
    return await createAttempt(newTask, prompt);

  } catch (error: any) {
    console.error('Failed to create attempt:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);

    // Handle foreign key constraint (invalid taskId)
    if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      console.error('Foreign key constraint violation');
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create attempt' },
      { status: 500 }
    );
  }
}

// Helper function to create attempt
async function createAttempt(task: any, prompt: string) {
  const newAttempt = {
    id: nanoid(),
    taskId: task.id,
    prompt,
    status: 'running' as const,
    branch: null,
    diffAdditions: 0,
    diffDeletions: 0,
    createdAt: Date.now(),
    completedAt: null,
  };

  await db.insert(schema.attempts).values(newAttempt);
  return NextResponse.json(newAttempt, { status: 201 });
}

// Helper function to create new task
async function createNewTask(taskId: string, projectId: string, taskTitle: string) {
  // Get next position for todo status
  const tasksInStatus = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.projectId, projectId),
        eq(schema.tasks.status, 'todo')
      )
    )
    .orderBy(desc(schema.tasks.position))
    .limit(1);

  const position = tasksInStatus.length > 0 ? tasksInStatus[0].position + 1 : 0;

  const newTask = {
    id: taskId,
    projectId,
    title: taskTitle,
    description: null,
    status: 'todo' as const,
    position,
    chatInit: false,
    rewindSessionId: null,
    rewindMessageUuid: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await db.insert(schema.tasks).values(newTask);
    return newTask;
  } catch (error) {
    console.error('Failed to create task:', error);
    return null;
  }
}

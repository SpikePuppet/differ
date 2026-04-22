import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createDatabase } from './db/index'
import { RepoRepository } from './repositories/repo'
import { SessionRepository } from './repositories/session'
import { CommentRepository } from './repositories/comment'
import { GitClient } from './git/client'
import { RepoService } from './services/repo'
import { SessionService } from './services/session'
import { CommentService } from './services/comment'
import { DiffService } from './services/diff'
import { registerIpc } from './ipc/index'

function createServices(dbPath: string) {
  const db = createDatabase(dbPath)
  const repoRepo = new RepoRepository(db)
  const sessionRepo = new SessionRepository(db)
  const commentRepo = new CommentRepository(db)
  const gitClient = new GitClient()

  return {
    repoService: new RepoService(repoRepo, gitClient),
    sessionService: new SessionService(repoRepo, sessionRepo, gitClient),
    commentService: new CommentService(repoRepo, sessionRepo, commentRepo, gitClient),
    diffService: new DiffService(repoRepo, sessionRepo, commentRepo, gitClient),
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'The Review · A Journal of Code in Translation',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'differ.db')
  const services = createServices(dbPath)
  registerIpc(services)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

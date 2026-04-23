import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createDatabase } from './db/index'
import { RepoRepository } from './repositories/repo'
import { SessionRepository } from './repositories/session'
import { CommentRepository } from './repositories/comment'
import { SettingsRepository } from './repositories/settings'
import { AiRepository } from './repositories/ai'
import { GitClient } from './git/client'
import { RepoService } from './services/repo'
import { SessionService } from './services/session'
import { CommentService } from './services/comment'
import { DiffService } from './services/diff'
import { SettingsService } from './services/settings'
import { AiService } from './services/ai'
import { registerIpc } from './ipc/index'

function createServices(dbPath: string) {
  const db = createDatabase(dbPath)
  const repoRepo = new RepoRepository(db)
  const sessionRepo = new SessionRepository(db)
  const commentRepo = new CommentRepository(db)
  const settingsRepo = new SettingsRepository(db)
  const aiRepo = new AiRepository(db)
  const gitClient = new GitClient()

  return {
    repoService: new RepoService(repoRepo, gitClient),
    sessionService: new SessionService(repoRepo, sessionRepo, gitClient),
    commentService: new CommentService(repoRepo, sessionRepo, commentRepo, gitClient),
    diffService: new DiffService(repoRepo, sessionRepo, commentRepo, gitClient),
    settingsService: new SettingsService(settingsRepo),
    aiService: new AiService(aiRepo, settingsRepo, sessionRepo, repoRepo),
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Differ',
    ...(process.platform === 'darwin' && { titleBarStyle: 'hiddenInset' }),
    backgroundColor: '#efe6d2',
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
  if (process.platform === 'darwin') {
    app.dock?.setIcon(path.join(__dirname, '../../build/icon.png'))
  }

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

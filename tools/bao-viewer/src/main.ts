import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'

type Vec3 = [number, number, number]
type Mode = 'fly' | 'orbit'
interface Capture {
  id: string
  label?: string
  position: Vec3
  forward?: Vec3
  target?: Vec3
  up?: Vec3
  rotation?: number[]
  fovDegrees?: number
  vertical_fov_degrees?: number
  focusDistance?: number
}
interface CameraData {
  cameras: Capture[]
  up?: Vec3
  defaultCameraId?: string
  default?: string
  navigationIds?: string[]
  movementSpeed?: number
  focusDistance?: number
  far?: number
}
interface SceneRecord {
  id: string
  title: string
  subtitle: string
  label: string
  status: 'pending' | 'training' | 'training_preview' | 'completed' | 'ready' | 'error'
  statusMessage?: string
  model: string
  cameras: string
  note?: string
  revision?: string
  defaultMode?: Mode
  background?: string
  highPrecision?: boolean
  iteration?: number
  totalIterations?: number
  gaussianCount?: number
  trainer?: string
}
interface Manifest { defaultScene?: string; scenes: SceneRecord[] }
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const canvas = el<HTMLCanvasElement>('scene')
const panel = el('load-panel')
const progress = el<HTMLProgressElement>('progress')
const tabs = el('scene-tabs')
const waypoints = el('waypoints')
const speedInput = el<HTMLInputElement>('speed')
// Match these Spirula vanilla 3dgs models: covariance +0.3, no opacity compensation.
// Keep ?kernel=spark as a reversible baseline for the original Spark AA kernel.
const kernelMode = new URLSearchParams(location.search).get('kernel') === 'spark' ? 'spark' : 'spirula'
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(70, 1, 0.001, 1000)
const worldUp = new THREE.Vector3(0, 1, 0)
const direction = new THREE.Vector3()
const right = new THREE.Vector3()
const desired = new THREE.Vector3()
const velocity = new THREE.Vector3()
const rotation = new THREE.Quaternion()
const localX = new THREE.Vector3(1, 0, 0)
const keys = new Set<string>()
let renderer: THREE.WebGLRenderer
let orbit: OrbitControls
let manifest: Manifest | null = null
let active: SceneRecord | null = null
let mesh: SplatMesh | null = null
let cameras: CameraData | null = null
let startCapture: Capture | null = null
let mode: Mode = 'fly'
let ready = false
let token = 0
let movementSpeed = 0.5
let focusDistance = 2
let lastTime = performance.now()
let fpsStart = lastTime
let frames = 0
let renderUntil = 0
let lastRendered = 0
let capturing = false
let introTour: { elapsed: number; quaternion: THREE.Quaternion } | null = null
let introStarted = false
const introDuration = 30
let pointer: { id: number; x: number; y: number } | null = null
let tween: { started: number; position: THREE.Vector3; quaternion: THREE.Quaternion; target: THREE.Vector3; nextPosition: THREE.Vector3; nextQuaternion: THREE.Quaternion; nextTarget: THREE.Vector3 } | null = null

function finiteVector(v: unknown): v is Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)
}
function asset(path: string, bust = true) {
  const url = new URL(path, document.baseURI)
  if (bust) url.searchParams.set('_v', `${active?.revision ?? ''}-${Date.now()}`)
  return url.toString()
}
function setPanel(title: string, detail: string, state: 'pending' | 'loading' | 'error') {
  panel.hidden = false
  panel.dataset.state = state
  el('load-title').textContent = title
  el('load-detail').textContent = detail
  el('load-kicker').textContent = state === 'error' ? 'SCENE UNAVAILABLE' : state === 'loading' ? 'LOADING SCENE' : 'SCENE IN PROGRESS'
  progress.hidden = state !== 'loading'
  progress.removeAttribute('value')
  el('retry').hidden = state === 'loading'
}
function setControlsEnabled(enabled: boolean) {
  for (const id of ['mode-fly', 'mode-orbit', 'reset', 'capture']) (el(id) as HTMLButtonElement).disabled = !enabled
}
function clearScene() {
  introTour = null
  ready = false
  keys.clear()
  velocity.set(0, 0, 0)
  tween = null
  pointer = null
  if (mesh) { scene.remove(mesh); mesh.dispose(); mesh = null }
  waypoints.replaceChildren()
  el('position-name').textContent = '等待场景'
  el('download').hidden = true
  el('capture-message').hidden = true
  setControlsEnabled(false)
  requestFrames(100)
}

async function refreshManifest(force = false) {
  try {
    const response = await fetch(asset('scenes.json'), { cache: 'no-store' })
    if (!response.ok) throw new Error(`无法读取场景清单（HTTP ${response.status}）。`)
    const data = await response.json() as Manifest
    if (!Array.isArray(data.scenes) || !data.scenes.length) throw new Error('场景清单为空。')
    if (data.scenes.some(s => !s.id || !s.model || !s.cameras)) throw new Error('场景清单缺少模型或相机路径。')
    manifest = data
    drawTabs()
    const id = active?.id ?? new URLSearchParams(location.search).get('scene') ?? data.defaultScene
    const next = data.scenes.find(s => s.id === id) ?? data.scenes[0]
    if (force || !active || JSON.stringify(active) !== JSON.stringify(next)) {
      const sameScene = active?.id === next.id
      const sameAssets = sameScene && active?.model === next.model && active?.cameras === next.cameras && active?.revision === next.revision && active?.highPrecision === next.highPrecision
      if (!force && ready && sameAssets && ['ready', 'training_preview', 'completed'].includes(next.status)) {
        // Step labels/notes can change independently of the model bytes.
        // Updating those must not reload the GPU scene or disturb the view.
        active = next
        updateRecordUI(next)
        drawTabs()
      } else await loadScene(next, Boolean(sameScene && ready))
    }
  } catch (error) {
    if (!ready) setPanel('场景暂时无法读取', message(error), 'error')
  }
}
function drawTabs() {
  tabs.replaceChildren()
  for (const record of manifest!.scenes) {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.id = record.id
    button.textContent = record.label || record.title
    button.className = record.id === active?.id ? 'selected' : ''
    button.setAttribute('aria-current', record.id === active?.id ? 'page' : 'false')
    const state = document.createElement('span')
    state.className = `scene-state ${record.status}`
    state.textContent = record.status === 'completed' ? '完成' : record.status === 'ready' ? '查看' : record.status === 'training_preview' ? '预览' : record.status === 'error' ? '待处理' : '准备中'
    button.append(state)
    button.addEventListener('click', () => { if (active?.id !== record.id) void loadScene(record) })
    tabs.append(button)
  }
}

function updateRecordUI(record: SceneRecord) {
  scene.background = new THREE.Color(record.background ?? '#101519')
  el('scene-title').textContent = record.title
  el('scene-subtitle').textContent = record.subtitle
  el('scene-note').textContent = record.note ?? ''
  const stage = record.status === 'training_preview' ? '训练预览' : record.status === 'completed' ? '训练完成' : record.status === 'ready' ? '模型就绪' : record.status === 'error' ? '等待处理' : '准备中'
  const steps = record.iteration ? `${record.iteration.toLocaleString('zh-CN')}${record.totalIterations ? ` / ${record.totalIterations.toLocaleString('zh-CN')}` : ''} 步` : ''
  el('stage-label').textContent = `${stage}${steps ? ` · ${steps}` : ''}`
  el('fact-stage').textContent = stage
  el('fact-steps').textContent = steps || '—'
  el('fact-trainer').textContent = record.trainer ?? 'Spirula Studio'
  document.title = `${record.title} · Gala X Ci`
  const pageUrl = new URL(location.href)
  pageUrl.searchParams.set('scene', record.id)
  history.replaceState({}, '', pageUrl)
}

async function loadScene(record: SceneRecord, preserveView = false) {
  const savedView = preserveView ? {
    position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(),
    target: orbit.target.clone(), fov: camera.fov, mode,
    label: el('position-name').textContent,
    waypoint: waypoints.querySelector<HTMLButtonElement>('button.active')?.dataset.id,
  } : null
  const currentToken = ++token
  clearScene()
  active = record
  updateRecordUI(record)
  drawTabs()
  if (!['ready', 'training_preview', 'completed'].includes(record.status)) {
    el('model-status').textContent = record.status === 'error' ? '等待处理' : '训练结果准备中'
    setPanel(record.status === 'error' ? '这个场景尚未就绪' : '新的重建正在准备', record.statusMessage ?? '模型完成后会自动读取，也可以稍后点击重新读取。', record.status === 'error' ? 'error' : 'pending')
    return
  }
  setPanel('正在读取三维场景', '正在下载三维模型，请稍候…', 'loading')
  el('model-status').textContent = '读取模型中'
  try {
    const [head, response] = await Promise.all([
      fetch(asset(record.model), { method: 'HEAD', cache: 'no-store' }),
      fetch(asset(record.cameras), { cache: 'no-store' }),
    ])
    if (currentToken !== token) return
    if (!head.ok) throw new Error(`模型文件暂时不可读取（HTTP ${head.status}）。请检查网络连接后重试。`)
    if (!response.ok) throw new Error(`相机位置文件暂时不可读取（HTTP ${response.status}）。`)
    const data = await response.json() as CameraData
    if (currentToken !== token) return
    data.cameras = (data.cameras ?? []).filter(c => c.id && finiteVector(c.position))
    if (!data.cameras.length) throw new Error('没有可用的重建机位，暂时无法确定正确观看位置。')
    cameras = data
    const distances = data.cameras.slice(1).map((c, i) => new THREE.Vector3().fromArray(c.position).distanceTo(new THREE.Vector3().fromArray(data.cameras[i].position))).filter(d => d > 1e-5).sort((a, b) => a - b)
    movementSpeed = data.movementSpeed && data.movementSpeed > 0 ? data.movementSpeed : Math.max(0.001, (distances[Math.floor(distances.length / 2)] ?? 1) * 0.7)
    focusDistance = data.focusDistance && data.focusDistance > 0 ? data.focusDistance : movementSpeed * 3
    startCapture = data.cameras.find(c => c.id === (data.defaultCameraId ?? data.default)) ?? data.cameras[0]
    if (finiteVector(data.up)) worldUp.fromArray(data.up).normalize()
    const loadedMesh = new SplatMesh({
      url: asset(record.model),
      extSplats: record.highPrecision ?? false,
      onProgress: event => {
        if (currentToken !== token) return
        if (event.total > 0) {
          progress.value = event.loaded / event.total
          el('load-detail').textContent = `${(event.loaded / 1048576).toFixed(1)} / ${(event.total / 1048576).toFixed(1)} MB · 正在读取`
        } else el('load-detail').textContent = `${(event.loaded / 1048576).toFixed(1)} MB · 正在解析`
      },
    })
    mesh = loadedMesh
    scene.add(loadedMesh)
    await loadedMesh.initialized
    if (currentToken !== token) return
    const count = loadedMesh.splats?.getNumSplats() ?? 0
    if (!count) throw new Error('文件中没有可渲染的高斯。')
    camera.near = Math.max(0.00001, movementSpeed / 200)
    camera.far = data.far && data.far > camera.near ? data.far : Math.max(100, movementSpeed * 5000)
    camera.updateProjectionMatrix()
    orbit.minDistance = Math.max(0.0001, movementSpeed / 100)
    orbit.maxDistance = Math.max(100, movementSpeed * 500)
    ready = true
    setControlsEnabled(true)
    setMode(record.defaultMode ?? 'fly')
    drawWaypoints(data)
    visit(startCapture, false)
    if (savedView) {
      mode = savedView.mode
      camera.up.copy(savedView.up)
      worldUp.copy(savedView.up)
      orbit.dispose()
      orbit = makeOrbit()
      camera.position.copy(savedView.position)
      camera.quaternion.copy(savedView.quaternion)
      camera.fov = savedView.fov
      camera.updateProjectionMatrix()
      orbit.target.copy(savedView.target)
      orbit.enabled = mode === 'orbit'
      for (const value of ['fly', 'orbit']) {
        el(`mode-${value}`).classList.toggle('active', value === mode)
        el(`mode-${value}`).setAttribute('aria-pressed', String(value === mode))
      }
      document.body.dataset.mode = mode
      el('position-name').textContent = savedView.label
      for (const b of waypoints.querySelectorAll('button')) b.classList.toggle('active', b.dataset.id === savedView.waypoint)
    }
    panel.hidden = true
    if (!savedView && !introStarted) {
      introStarted = true
      setMode('fly')
      introTour = { elapsed: 0, quaternion: camera.quaternion.clone() }
      el('position-name').textContent = '自动漫游 · 环顾一周'
    }
    requestFrames(2000)
    el('model-status').textContent = `${count.toLocaleString('zh-CN')} 个高斯`
    const download = el<HTMLAnchorElement>('download')
    download.href = asset(record.model, false)
    download.hidden = false
  } catch (error) {
    if (currentToken !== token) return
    clearScene()
    el('model-status').textContent = '加载失败'
    setPanel('模型暂时无法显示', message(error), 'error')
  }
}

function drawWaypoints(data: CameraData) {
  let items = data.navigationIds?.length ? data.navigationIds.map(id => data.cameras.find(c => c.id === id)).filter((c): c is Capture => Boolean(c)) : data.cameras
  if (items.length > 24) items = items.filter((_, i) => i % Math.ceil(items.length / 24) === 0)
  if (startCapture && !items.some(c => c.id === startCapture!.id)) items.unshift(startCapture)
  for (const capture of items) {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.id = capture.id
    button.textContent = capture.label ?? capture.id
    button.addEventListener('click', () => visit(capture))
    waypoints.append(button)
  }
}
function captureDirection(capture: Capture) {
  if (finiteVector(capture.forward)) return new THREE.Vector3().fromArray(capture.forward).normalize()
  if (finiteVector(capture.target)) return new THREE.Vector3().fromArray(capture.target).sub(new THREE.Vector3().fromArray(capture.position)).normalize()
  if (capture.rotation?.length === 9) return new THREE.Vector3(capture.rotation[2], capture.rotation[5], capture.rotation[8]).normalize()
  return new THREE.Vector3(0, 0, -1)
}
function captureUp(capture: Capture) {
  if (finiteVector(capture.up)) return new THREE.Vector3().fromArray(capture.up).normalize()
  if (capture.rotation?.length === 9) return new THREE.Vector3(-capture.rotation[1], -capture.rotation[4], -capture.rotation[7]).normalize()
  return finiteVector(cameras?.up) ? new THREE.Vector3().fromArray(cameras!.up!) : new THREE.Vector3(0, 1, 0)
}
function visit(capture: Capture, smooth = true) {
  if (!ready) return
  introTour = null
  velocity.set(0, 0, 0)
  const next = new THREE.PerspectiveCamera()
  next.position.fromArray(capture.position)
  next.up.copy(captureUp(capture)).normalize()
  const target = finiteVector(capture.target) ? new THREE.Vector3().fromArray(capture.target) : next.position.clone().addScaledVector(captureDirection(capture), capture.focusDistance ?? focusDistance)
  next.lookAt(target)
  const previousUp = camera.up.clone()
  worldUp.copy(next.up)
  camera.up.copy(next.up)
  if (previousUp.distanceToSquared(camera.up) > 1e-10) {
    // OrbitControls caches the camera-up basis in its constructor. Recreate it
    // through public APIs when calibrated scenes use a different world up.
    const oldTarget = orbit.target.clone()
    const oldPosition = camera.position.clone()
    const oldQuaternion = camera.quaternion.clone()
    orbit.dispose()
    orbit = makeOrbit()
    orbit.target.copy(oldTarget)
    camera.position.copy(oldPosition)
    camera.quaternion.copy(oldQuaternion)
  }
  camera.fov = THREE.MathUtils.clamp(capture.fovDegrees ?? capture.vertical_fov_degrees ?? 70, 20, 110)
  camera.updateProjectionMatrix()
  if (smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tween = { started: performance.now(), position: camera.position.clone(), quaternion: camera.quaternion.clone(), target: orbit.target.clone(), nextPosition: next.position.clone(), nextQuaternion: next.quaternion.clone(), nextTarget: target }
  } else {
    tween = null
    camera.position.copy(next.position)
    camera.quaternion.copy(next.quaternion)
    orbit.target.copy(target)
    if (mode === 'orbit') orbit.update()
  }
  el('position-name').textContent = capture.label ?? `位置 ${capture.id}`
  for (const b of waypoints.querySelectorAll('button')) b.classList.toggle('active', b.dataset.id === capture.id)
  requestFrames(1500)
}
function setMode(next: Mode) {
  if (introTour) markFree()
  mode = next
  if (orbit) orbit.enabled = ready && mode === 'orbit'
  if (ready && mode === 'orbit') {
    camera.getWorldDirection(direction)
    orbit.target.copy(camera.position).addScaledVector(direction, focusDistance)
    orbit.update()
  }
  for (const value of ['fly', 'orbit']) {
    el(`mode-${value}`).classList.toggle('active', value === mode)
    el(`mode-${value}`).setAttribute('aria-pressed', String(value === mode))
  }
  document.body.dataset.mode = mode
  el('scene').setAttribute('aria-label', mode === 'fly' ? '三维高斯场景；拖动环顾，WASD 移动，Q 和 E 升降' : '三维高斯场景；拖动环绕，滚轮缩放，右键平移')
  el('scene').style.cursor = 'grab'
  keys.clear()
  velocity.set(0, 0, 0)
  requestFrames(750)
}
function markFree() {
  introTour = null
  tween = null
  el('position-name').textContent = '自由视点'
  for (const b of waypoints.querySelectorAll('button.active')) b.classList.remove('active')
  requestFrames(750)
}

function requestFrames(duration = 750) {
  const now = performance.now()
  if (now > renderUntil) { fpsStart = now; frames = 0 }
  renderUntil = Math.max(renderUntil, now + duration)
}

function animate(time: number) {
  const dt = Math.min((time - lastTime) / 1000, 0.05)
  lastTime = time
  if (document.hidden) return
  if (ready) {
    if (introTour) {
      introTour.elapsed = Math.min(introDuration, introTour.elapsed + dt)
      const t = introTour.elapsed / introDuration
      const eased = t * t * (3 - 2 * t)
      rotation.setFromAxisAngle(worldUp, -Math.PI * 2 * eased)
      camera.quaternion.copy(introTour.quaternion).premultiply(rotation)
      requestFrames(500)
      if (t === 1) {
        camera.quaternion.copy(introTour.quaternion)
        introTour = null
        el('position-name').textContent = startCapture?.label ?? '漫游结束 · 自由探索'
      }
    }
    if (tween) {
      const t = THREE.MathUtils.clamp((time - tween.started) / 750, 0, 1)
      const s = t * t * (3 - 2 * t)
      camera.position.lerpVectors(tween.position, tween.nextPosition, s)
      camera.quaternion.slerpQuaternions(tween.quaternion, tween.nextQuaternion, s)
      orbit.target.lerpVectors(tween.target, tween.nextTarget, s)
      if (t === 1) tween = null
    }
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'))
    const side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'))
    const vertical = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'))
    desired.set(0, 0, 0)
    if (forward || side || vertical) {
      if (mode !== 'fly') setMode('fly')
      markFree()
      camera.getWorldDirection(direction)
      direction.addScaledVector(worldUp, -direction.dot(worldUp)).normalize()
      right.crossVectors(direction, worldUp).normalize()
      desired.addScaledVector(direction, forward).addScaledVector(right, side).addScaledVector(worldUp, vertical).normalize()
      desired.multiplyScalar(movementSpeed * Number(speedInput.value) * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.5 : 1))
    }
    velocity.lerp(desired, 1 - Math.exp(-12 * dt))
    camera.position.addScaledVector(velocity, dt)
    if (mode === 'orbit' && !tween) orbit.update()
  }
  // Rendering is demand-driven, with a short settling window for Spark's
  // asynchronous sort. Moving views are capped at 30 FPS to leave GPU time
  // available for training; idle views and pending scenes do not redraw.
  if (time > renderUntil) { if (ready) el('fps').textContent = '静止'; return }
  if (time - lastRendered < 1000 / 30) return
  renderer.render(scene, camera)
  lastRendered = time
  frames++
  if (time - fpsStart > 1000) {
    el('fps').textContent = ready ? `${Math.round(frames * 1000 / (time - fpsStart))} FPS` : ''
    fpsStart = time; frames = 0
  }
}
function resize() {
  const rect = canvas.getBoundingClientRect()
  renderer.setSize(Math.max(rect.width, 1), Math.max(rect.height, 1), false)
  camera.aspect = rect.width / Math.max(rect.height, 1)
  camera.updateProjectionMatrix()
  requestFrames(750)
}
function message(error: unknown) { return error instanceof Error ? error.message : String(error) }

function makeOrbit() {
  const control = new OrbitControls(camera, canvas)
  control.enabled = ready && mode === 'orbit'
  control.enableDamping = true
  control.dampingFactor = 0.1
  control.screenSpacePanning = true
  control.minDistance = Math.max(0.0001, movementSpeed / 100)
  control.maxDistance = Math.max(100, movementSpeed * 500)
  control.addEventListener('start', markFree)
  control.addEventListener('change', () => requestFrames(500))
  return control
}

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  scene.add(new SparkRenderer({
    renderer,
    ...(kernelMode === 'spirula' ? { preBlurAmount: 0.3, blurAmount: 0 } : {}),
  }))
  orbit = makeOrbit()
  resize()
  window.addEventListener('resize', resize)
  renderer.setAnimationLoop(animate)
  void refreshManifest()
  window.setInterval(() => { if (!active || !['ready', 'completed'].includes(active.status)) void refreshManifest() }, 10000)
} catch (error) {
  setPanel('无法启动三维查看器', `浏览器未能启动 WebGL2。${message(error)}`, 'error')
}

canvas.addEventListener('pointerdown', event => {
  if (!ready || event.button !== 0 || mode !== 'fly') return
  markFree()
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
  canvas.setPointerCapture(event.pointerId)
  canvas.focus({ preventScroll: true })
})
canvas.addEventListener('pointermove', event => {
  if (!pointer || event.pointerId !== pointer.id || mode !== 'fly') return
  const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y
  pointer.x = event.clientX; pointer.y = event.clientY
  if (!dx && !dy) return
  markFree()
  rotation.setFromAxisAngle(worldUp, -dx * 0.003)
  camera.quaternion.premultiply(rotation)
  camera.getWorldDirection(direction)
  const pitch = Math.asin(THREE.MathUtils.clamp(direction.dot(worldUp), -1, 1))
  const delta = THREE.MathUtils.clamp(pitch - dy * 0.003, -1.48, 1.48) - pitch
  rotation.setFromAxisAngle(localX, delta)
  camera.quaternion.multiply(rotation)
})
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { pointer = null })
canvas.addEventListener('wheel', event => {
  if (!ready || mode !== 'fly') return
  event.preventDefault()
  markFree()
  camera.getWorldDirection(direction)
  camera.position.addScaledVector(direction, -Math.sign(event.deltaY) * movementSpeed * Number(speedInput.value) * 0.2)
}, { passive: false })
const arrowKeys: Record<string, string> = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD' }
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'])
const heldMovement = new Map<string, string>()
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return
  const code = arrowKeys[event.code] ?? event.code
  if (movementKeys.has(code) && ready) {
    if (mode === 'orbit') setMode('fly')
    markFree()
    heldMovement.set(event.code, code)
    keys.add(code)
    event.preventDefault()
  }
  if (event.code === 'KeyR' && startCapture) visit(startCapture)
  if (event.code === 'Escape') toggleHelp(false)
})
window.addEventListener('keyup', event => {
  const code = heldMovement.get(event.code)
  heldMovement.delete(event.code)
  if (code && !Array.from(heldMovement.values()).includes(code)) keys.delete(code)
})
window.addEventListener('blur', () => { heldMovement.clear(); keys.clear(); velocity.set(0, 0, 0); pointer = null })
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-key]')) {
  button.addEventListener('pointerdown', event => {
    if (!ready) return
    if (mode !== 'fly') setMode('fly')
    markFree()
    button.setPointerCapture(event.pointerId)
    keys.add(button.dataset.key!)
    event.preventDefault()
  })
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => keys.delete(button.dataset.key!))
}
el('mode-fly').addEventListener('click', () => setMode('fly'))
el('mode-orbit').addEventListener('click', () => setMode('orbit'))
el('reset').addEventListener('click', () => { if (startCapture) visit(startCapture) })
el('reload').addEventListener('click', () => void refreshManifest(true))
el('retry').addEventListener('click', () => void refreshManifest(true))
document.addEventListener('visibilitychange', () => { if (!document.hidden) requestFrames(1000) })
el('capture').addEventListener('click', () => void saveCapture())

async function saveCapture() {
  if (!ready || !active || capturing) return
  const record = active
  const currentToken = token
  const button = el<HTMLButtonElement>('capture')
  const notice = el('capture-message')
  capturing = true
  button.disabled = true
  notice.hidden = false
  notice.textContent = '正在保存当前画面…'
  try {

    // WebGL clears its default buffer after presenting. Render immediately
    // before requesting toBlob so the captured PNG contains this exact view.
    renderer.render(scene, camera)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('未能生成画面。')), 'image/png'))
    if (blob.size > 20 * 1024 * 1024) throw new Error('画面超过 20 MB，请缩小窗口后再保存。')
    if (currentToken !== token) throw new Error('场景已切换，请重新保存当前画面。')
    if (!['127.0.0.1', 'localhost'].includes(location.hostname)) {
      const objectUrl = URL.createObjectURL(blob)
      const download = document.createElement('a')
      download.href = objectUrl
      download.download = 'bao-restaurant.png'
      download.click()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000)
      notice.textContent = '画面已下载。'
      return
    }
    const url = new URL('api/captures', document.baseURI)
    url.searchParams.set('scene', record.id)
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: blob })
    if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('本机保存服务尚未就绪，请重新启动查看器服务。')
    const result = await response.json() as { url?: string; path?: string; error?: string }
    if (!response.ok || !result.url) throw new Error(result.error ?? '本机保存失败，请确认查看器服务已更新。')
    notice.replaceChildren(document.createTextNode('已保存到本地 · '))
    const link = document.createElement('a')
    link.href = result.url
    link.textContent = '查看 PNG'
    link.target = '_blank'
    link.rel = 'noopener'
    if (result.path) link.title = result.path
    notice.append(link)
  } catch (error) {
    notice.textContent = message(error)
  } finally {
    capturing = false
    button.disabled = !ready
    requestFrames(500)
  }
}
function toggleHelp(show: boolean) { el('help-panel').hidden = !show; el('help').setAttribute('aria-expanded', String(show)) }
el('help').addEventListener('click', () => toggleHelp(el('help-panel').hidden))
el('help-close').addEventListener('click', () => toggleHelp(false))
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); ready = false; setPanel('图形资源暂时不可用', '浏览器释放了图形资源。关闭其他大型三维页面后，重新加载此页。', 'error') })
canvas.addEventListener('webglcontextrestored', () => location.reload())

# @inngest-hitl/a2a

A2Aプロトコル仕様準拠のTypeScriptライブラリ。Next.jsやその他のフレームワークと統合可能な、独立したパッケージとして設計されています。

## 概要

このライブラリは、[A2A (Agent-to-Agent) Protocol](https://a2aproject.github.io/A2A/latest/) の公式仕様に準拠した実装を提供します。Human-in-the-Loop (HITL) ワークフローを含む、エージェント間の通信を簡潔に実装できます。

### 主な特徴

- **A2A仕様準拠**: 公式JSONスキーマに基づく厳密な型定義
- **SSEデフォルト対応**: リアルタイム通信をデフォルトでサポート（Memory/Redis対応）
- **Input-Required対応**: ユーザー入力待機と再開処理を自動化
- **永続化サポート**: Task/Message/Artifactの完全な履歴管理
- **Inngest統合**: Inngestワークフローとの完全な統合サポート
- **クロスデータベース**: PostgreSQL/SQLite対応のDrizzleアダプター
- **型安全**: Zodによる実行時バリデーション
- **テスト完備**: 全機能に対する包括的なテスト

## 開発方針

### 1. Structパターン（関数型プログラミング）

クラスベースではなく、関数とデータ構造を組み合わせたStructパターンを採用しています。

```typescript
// ❌ クラスベース（使用しない）
class A2A {
  constructor() {}
  processMessage() {}
}

// ✅ Structパターン（推奨）
function createA2A(config) {
  return {
    processMessage: () => {},
    register: () => {}
  }
}
```

### 2. Zodによる型定義

全てのデータ構造はZodスキーマで定義し、実行時バリデーションを提供します。

```typescript
import { z } from 'zod'

export const MessageSchema = z.object({
  kind: z.literal('message'),
  messageId: z.string(),
  role: z.enum(['agent', 'user']),
  parts: z.array(PartSchema)
})

export type Message = z.infer<typeof MessageSchema>
```

### 3. 完全なテストカバレッジ

全ての公開APIに対してテストを用意し、動作を保証します。

## 命名規則

このライブラリは、エコシステムの標準に従った命名規則を採用しています：

| 用語 | 由来 | 説明 |
|------|------|------|
| `executor` | @a2a-js/sdk | メッセージを処理する実行単位 |
| `integration` | better-auth | フレームワーク固有の統合コード |
| `adapter` | better-auth | ストレージ実装の抽象化 |

### 命名例

```typescript
// Executor（メッセージ処理）
export const researchExecutor = defineExecutor({...})

// Integration（フレームワーク統合）
export const { POST, GET } = nextjsIntegration(a2a)

// Adapter（ストレージ実装）
const storage = drizzleAdapter(db)
```

## A2A仕様準拠

このライブラリは[A2A公式仕様](https://a2aproject.github.io/A2A/latest/specification/)に厳密に準拠しています。

### TaskState

A2A仕様で定義される9つの状態を完全サポート：

- `submitted`: タスク送信済み
- `working`: 処理中
- `input-required`: ユーザー入力待ち
- `completed`: 正常完了
- `canceled`: キャンセル
- `failed`: エラー終了
- `rejected`: 拒否
- `auth-required`: 認証要求
- `unknown`: 不明な状態

### データ構造

```typescript
// Task（A2A仕様準拠）
{
  kind: "task",
  id: string,              // タスクID
  contextId: string,       // コンテキストID
  status: {
    state: TaskState,      // 上記9つの状態
    message?: Message,     // 状態に関するメッセージ
    timestamp?: string     // ISO 8601形式
  },
  artifacts?: Artifact[],  // 関連アーティファクト
  history?: Message[],     // メッセージ履歴
  metadata?: object        // 任意のメタデータ
}

// Message（A2A仕様準拠）
{
  kind: "message",
  messageId: string,
  role: "agent" | "user",
  parts: Part[],           // TextPart | FilePart | DataPart
  extensions?: string[],   // Extension URIs
  // ... その他のオプションフィールド
}
```

## クイックスタート

### インストール

```bash
npm install @inngest-hitl/a2a zod
```

### 基本的な使用例

```typescript
import { createA2A, defineExecutor, nextjsIntegration } from '@inngest-hitl/a2a'
import { z } from 'zod'

// 1. Executorを定義
const helloExecutor = defineExecutor({
  extension: 'https://example.com/hello/v1',
  input: z.object({
    name: z.string()
  }),
  output: z.object({
    message: z.string(),
    timestamp: z.string()
  }),
  execute: async (input, context) => {
    // ステータス更新
    await context.updateStatus('working', `Hello ${input.name}!`)
    
    // 処理完了
    await context.updateStatus('completed', 'Done')
    
    // outputスキーマに従った戻り値（自動的にバリデーションされる）
    return { 
      message: `Hello ${input.name}!`,
      timestamp: new Date().toISOString()
    }
  }
})

// 2. A2Aインスタンスを作成
const a2a = createA2A()
  .register(helloExecutor)

// 3. Next.jsに統合
export const { POST, GET } = nextjsIntegration(a2a)
```

## 主要機能

### SSEサポート（デフォルト有効）

Server-Sent Eventsによるリアルタイム通信をデフォルトでサポートします。

```typescript
// デフォルト設定（SSE有効）
export const { POST, GET } = nextjsIntegration(a2a)
// → GET /api/a2a/events でSSEエンドポイントが利用可能

// SSEを無効化
export const { POST } = nextjsIntegration(a2a, {
  sse: false
})

// SSEパスをカスタマイズ
export const { POST, GET } = nextjsIntegration(a2a, {
  sse: { path: '/stream' }
})
```

#### SSEの仕組み

SSEは以下のように動作します：

1. **接続確立**: クライアントが `GET /api/a2a/events?taskId={taskId}` に接続
2. **イベント送信**: Executorのcontext操作が自動的にSSEイベントを生成
3. **接続管理**: タスク完了時またはタイムアウト時に自動的にクリーンアップ

送信されるイベントタイプ：
- `status-update`: タスクのステータスが変更された時
- `input-required`: ユーザー入力が必要になった時  
- `artifact-update`: 新しいアーティファクトが保存された時
- `task-complete`: タスクが完了した時


#### ExecutorからのSSE送信

Executor内でのイベント送信は自動化されています：

```typescript
const myExecutor = defineExecutor({
  execute: async (input, context) => {
    // updateStatusを呼ぶと自動的にSSEイベントが送信される
    await context.updateStatus('working', '処理を開始します')
    
    // 何か処理
    const result = await doSomething()
    
    // updateArtifactも自動的にSSEイベントを送信
    const artifact = await context.updateArtifact({
      kind: 'result',
      data: result
    })
    
    // requireInputも自動的にSSEイベントを送信
    // await context.requireInput({
    //   question: '続行しますか？',
    //   artifacts: [artifact]
    // })
  }
})
```

### Input-Requiredと再開処理

ユーザー入力が必要な場合の処理を自動化します。

```typescript
const approvalExecutor = defineExecutor({
  extension: 'https://example.com/approval/v1',
  
  execute: async (input, context) => {
    // 何か処理を実行
    const result = await doSomething()
    
    // ユーザーの承認を要求
    // const requestId = await context.requireInput({
    //   question: 'この結果を承認しますか？',
    //   artifacts: [
    //     { kind: 'result', data: result }
    //   ]
    // })
    
    // ここで処理は一時停止
    // ユーザーの応答は別のexecutorで処理される
  }
})
```

#### 設計思想：Executorの分離

このライブラリでは、タスクの開始とinput-requiredへの応答を**別々のexecutor**で処理する設計を採用しています。

```typescript
// 1. タスク開始用executor
const startTaskExecutor = defineExecutor({
  extension: 'https://example.com/task-start/v1',
  execute: async (input, context) => {
    // 処理を開始し、ユーザー入力を要求
    // const requestId = await context.requireInput({...})
    return { status: 'input-required', requestId }
  }
})

// 2. フィードバック処理用executor（別のextension）
const feedbackExecutor = defineExecutor({
  extension: 'https://example.com/task-feedback/v1',
  execute: async (input, context) => {
    // フィードバックを処理
    if (input.approved) {
      await context.updateStatus('completed', '承認されました')
    }
  }
})
```

この設計の利点：
- **単一責任の原則**: 各executorが明確な役割を持つ
- **拡張性**: 新しいフィードバックタイプを簡単に追加
- **A2A仕様準拠**: Extension URIによる明確な区別
- **テスタビリティ**: 各executorを独立してテスト可能

関連するexecutorをグループ化するヘルパーも提供可能です：

```typescript
// ワークフロー全体をまとめて定義
export function createApprovalWorkflow() {
  return {
    start: startTaskExecutor,
    feedback: feedbackExecutor
  }
}

// 一括登録
const workflow = createApprovalWorkflow()
a2a.register(workflow.start)
   .register(workflow.feedback)
```

### ストレージアダプター

タスクの永続化のため、各種ORMに対応したアダプターを提供します。

#### Drizzle アダプター（推奨）

PostgreSQLとSQLiteの両方をサポートするDrizzleアダプターを提供しています。

```typescript
import { drizzleAdapter } from '@inngest-hitl/a2a'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

// PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

// SQLite (Turso/LibSQL対応)
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const client = createClient({ url: process.env.TURSO_DATABASE_URL })
const db = drizzle(client)

// A2A統合
const a2a = createA2A({
  storage: drizzleAdapter(db, {
    // 既存のテーブルを使用する場合（自動検出）
    autoDetect: true,
    
    // または明示的にスキーマを指定
    schema: {
      tasks: 'a2a_tasks',
      messages: 'a2a_messages', 
      artifacts: 'a2a_artifacts'
    }
  })
})
```

#### インメモリアダプター（開発用）

開発・テスト用途にはインメモリアダプターを使用できます。

```typescript
import { memoryAdapter } from '@inngest-hitl/a2a'

const a2a = createA2A({
  storage: memoryAdapter()
})
```

## ディレクトリ構成

```
lib/a2a/
├── core.ts              # A2Aコア実装
├── client.ts            # HTTP Client（Inngest統合用）
├── executor.ts          # Executor定義ヘルパー
├── schemas/             # Zodスキーマ定義
│   ├── base.ts          # 基本型（Role, TaskState等）
│   ├── parts.ts         # Part型（TextPart, FilePart, DataPart）
│   ├── message.ts       # Message型
│   ├── artifact.ts      # Artifact型
│   ├── task.ts          # Task型
│   └── json-rpc.ts      # JSON-RPC型定義
├── storage/             # ストレージ層
│   ├── adapter.ts       # StorageAdapterインターフェース
│   └── adapters/        # 各種アダプター実装
│       ├── memory.ts    # インメモリ（開発用）
│       └── drizzle/     # Drizzle ORM（v3）
│           ├── adapter.ts      # メインアダプター
│           ├── schema.ts       # テーブルスキーマ
│           └── __tests__/      # テスト
├── integrations/        # フレームワーク統合
│   ├── nextjs/          # Next.js
│   │   ├── index.ts     # nextjsIntegration
│   │   ├── handler.ts   # Route Handler
│   │   ├── sse.ts       # SSE実装
│   │   └── dynamic-handler.ts # Dynamic routing
│   └── redis/           # Redis Pub/Sub SSE
│       ├── setup.ts     # Redis統合設定
│       ├── sse-handler.ts    # Redis SSE Handler
│       ├── event-sender.ts   # イベント送信
│       └── __tests__/   # Redis統合テスト
├── types.ts             # 型定義
├── index.ts             # パブリックAPI
└── README.md            # このファイル
```

## Inngest統合

A2AライブラリはInngestワークフローエンジンとの完全な統合を提供します。これにより、複雑なHuman-in-the-Loopワークフローを堅牢でスケーラブルに実装できます。

### 統合アーキテクチャ

```
A2A Executor → Inngest Event → Workflow → HTTP Client → A2A Task
     ↑                                                      ↓
     └─────────────── SSE Events ←──────────────────────────┘
```

### 基本的な統合例

```typescript
// 1. A2A Executor（Inngestワークフローを開始）
const researchStartExecutor = defineExecutor({
  extension: 'https://example.com/research/start/v1',
  input: z.object({
    theme: z.string(),
    depth: z.enum(['basic', 'detailed'])
  }),
  
  execute: async (input, context) => {
    // Inngestワークフローを開始
    const { ids } = await inngest.send({
      name: 'research.workflow.start',
      data: {
        taskId: context.taskId,  // 重要: taskIdを渡す
        theme: input.theme,
        depth: input.depth,
        originalMessage: context.message
      }
    })
    
    // input-requiredステートに移行
    // const requestId = await context.requireInput({
    //   question: 'リサーチプランを生成中です。承認をお待ちしています...',
    //   artifacts: []
    // })
    
    return {
      status: 'input-required',
      requestId,
      inngestRunId: ids[0]
    }
  }
})

// 2. Inngestワークフロー関数
const researchWorkflow = inngest.createFunction(
  { id: 'research-workflow' },
  { event: 'research.workflow.start' },
  async ({ event, step }) => {
    const { taskId, theme, depth } = event.data
    
    // ExecutorContext Clientを作成
    const httpClient = createA2AHttpClient({
      baseUrl: 'http://localhost:3000/api/a2a'
    })
    const context = createExecutorContextClient(httpClient, taskId, event.data.originalMessage)
    
    // フェーズ1: リサーチプラン生成
    await context.updateStatus('working', 'プランを生成中...')
    
    const plan = await step.run('generate-plan', async () => {
      return await generateResearchPlan(theme, depth)
    })
    
    // プランをアーティファクトとして保存
    await context.updateArtifact({
      name: 'Research Plan',
      description: `Research plan for: ${theme}`,
      data: plan
    })
    
    // フェーズ2: プラン承認待ち
    const planApproval = await step.waitForEvent('wait-for-plan-approval', {
      event: 'research.plan.feedback',
      timeout: '30m',
      if: `async.data.taskId == "${taskId}"`
    })
    
    if (!planApproval || planApproval.data.decision !== 'approve') {
      await context.updateStatus('completed', 'プランが承認されませんでした')
      return { status: 'rejected', phase: 'plan' }
    }
    
    // フェーズ3: リサーチ実行
    await context.updateStatus('working', 'リサーチを実行中...')
    
    const execution = await step.run('execute-research', async () => {
      return await executeResearch(plan)
    })
    
    // 実行結果を保存
    await context.updateArtifact({
      name: 'Research Results',
      description: 'Research execution results',
      data: execution
    })
    
    // フェーズ4: 実行結果承認待ち
    const executionApproval = await step.waitForEvent('wait-for-execution-approval', {
      event: 'research.execution.feedback',
      timeout: '30m',
      if: `async.data.taskId == "${taskId}"`
    })
    
    if (executionApproval?.data.decision === 'approve') {
      await context.updateStatus('completed', 'リサーチが完了しました')
      return { status: 'completed', results: execution }
    } else {
      await context.updateStatus('completed', '実行結果が承認されませんでした')
      return { status: 'rejected', phase: 'execution' }
    }
  }
)

// 3. フィードバック処理用Executor
const planApprovalExecutor = defineExecutor({
  extension: 'https://example.com/research/plan-approval/v1',
  input: z.object({
    requestId: z.string(),
    decision: z.enum(['approve', 'reject']),
    feedback: z.string().optional()
  }),
  
  execute: async (input, context) => {
    // Inngestにフィードバックイベントを送信
    await inngest.send({
      name: 'research.plan.feedback',
      data: {
        taskId: context.taskId,
        decision: input.decision,
        feedback: input.feedback,
        requestId: input.requestId
      }
    })
    
    if (input.decision === 'approve') {
      await context.updateStatus('working', 'プランが承認されました。実行結果をお待ちください...')
      
      // 次のinput-requiredステートに移行
      // const requestId = await context.requireInput({
      //   question: 'リサーチを実行中です。実行結果の承認をお待ちしています...',
      //   artifacts: []
      // })
      
      return { status: 'input-required', requestId }
    } else {
      await context.updateStatus('completed', 'プランが承認されませんでした')
      return { status: 'completed', message: 'Plan was rejected' }
    }
  }
})
```

### 統合のベストプラクティス

#### 1. taskIdの一貫性

**重要**: A2AとInngestの間でtaskIdを一貫して使用してください。

```typescript
// ✅ 正しい例
const context = createExecutorContextClient(httpClient, taskId, originalMessage)

// ❌ 間違った例 - 新しいIDを生成してはいけない
const context = createExecutorContextClient(httpClient, crypto.randomUUID(), originalMessage)
```

#### 2. context.taskIdをJSON-RPCに渡す

フロントエンドからのフィードバック送信時には、必ずcontextにtaskIdを含めてください。

```typescript
// ✅ 正しい例
const feedbackRequest = {
  jsonrpc: '2.0',
  id: crypto.randomUUID(),
  method: 'message/send',
  params: {
    message: { /* ... */ },
    context: {
      taskId: currentState.taskId  // 重要!
    }
  }
}
```

#### 3. タイムアウト設定

長時間のユーザー操作を考慮してタイムアウトを設定してください。

```typescript
const approval = await step.waitForEvent('wait-approval', {
  event: 'feedback.received',
  timeout: '30m',  // 30分のタイムアウト
  if: `async.data.taskId == "${taskId}"`
})
```

### Redis SSE統合

大規模なアプリケーションでは、Redis Pub/Subを使用したSSEを利用できます。

```typescript
import { createA2A, redisSSEEventSender } from '@inngest-hitl/a2a'
import Redis from 'ioredis'

// Redis接続
const redis = new Redis(process.env.REDIS_URL)

// Redis SSE統合
const a2a = createA2A({
  storage: drizzleAdapter(db),
  eventSender: redisSSEEventSender(redis)
})

// Next.js統合（Redis SSE対応）
export const { POST, GET } = nextjsIntegration(a2a, {
  sse: {
    mode: 'redis',
    redis: redis
  }
})
```

詳細は[Redis SSE README](./integrations/redis/README.md)を参照してください。

## 高度な使用例

### カスタムストレージアダプター

独自のストレージを実装する場合：

```typescript
import type { StorageAdapter } from '@inngest-hitl/a2a'

const myAdapter: StorageAdapter = {
  async saveTask(task) {
    // タスクを保存
  },
  async getTask(taskId) {
    // タスクを取得
  },
  async saveMessage(taskId, message) {
    // メッセージを保存
  },
  async getMessages(taskId) {
    // メッセージ履歴を取得
  },
  async updateArtifact(artifact) {
    // アーティファクトを保存
  },
  async getArtifact(artifactId) {
    // アーティファクトを取得
  }
}

const a2a = createA2A({
  storage: myAdapter
})
```

### 複雑なExecutor

```typescript
const researchExecutor = defineExecutor({
  extension: 'https://example.com/research/v1',
  
  input: z.object({
    theme: z.string(),
    depth: z.enum(['basic', 'detailed'])
  }),
  
  output: z.object({
    status: z.enum(['processing', 'input-required']),
    requestId: z.string().optional()
  }),
  
  execute: async (input, context) => {
    // 1. 開始通知
    await context.updateStatus('working', 'リサーチを開始します')
    
    // 2. プラン生成
    const plan = await generatePlan(input.theme)
    
    // 3. プランをアーティファクトとして保存
    const planArtifact = await context.updateArtifact({
      kind: 'research-plan',
      name: 'Research Plan',
      data: plan
    })
    
    // 4. ユーザー承認を要求
    // const requestId = await context.requireInput({
    //   question: 'このプランでよろしいですか？',
    //   artifacts: [planArtifact]
    // })
    
    // ここで一時停止（ユーザーの応答待ち）
    // outputスキーマに従った戻り値
    return {
      status: 'input-required' as const,
      requestId
    }
  }
})
```

## マイグレーション

Drizzleアダプターを使用する場合、以下のSQLでテーブルを作成します：

```sql
-- Task table
CREATE TABLE a2a_tasks (
  id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL,
  kind TEXT DEFAULT 'task' NOT NULL,
  status_state TEXT NOT NULL,
  status_message JSONB,
  status_timestamp TEXT,
  metadata JSONB,
  executor_extension TEXT,
  input_prompt JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP
);

-- Message history table
CREATE TABLE a2a_messages (
  id SERIAL PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE,
  kind TEXT DEFAULT 'message' NOT NULL,
  role TEXT NOT NULL,
  parts JSONB NOT NULL,
  context_id TEXT,
  task_id TEXT REFERENCES a2a_tasks(id),
  extensions JSONB,
  metadata JSONB,
  reference_task_ids JSONB,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Artifacts table
CREATE TABLE a2a_artifacts (
  artifact_id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  parts JSONB NOT NULL,
  extensions JSONB,
  metadata JSONB,
  task_id TEXT NOT NULL REFERENCES a2a_tasks(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_a2a_tasks_context_id ON a2a_tasks(context_id);
CREATE INDEX idx_a2a_tasks_status_state ON a2a_tasks(status_state);
CREATE INDEX idx_a2a_messages_task_id ON a2a_messages(task_id);
CREATE INDEX idx_a2a_artifacts_task_id ON a2a_artifacts(task_id);
```

## API リファレンス

### Core

#### `createA2A(config?)`

A2Aインスタンスを作成します。

```typescript
const a2a = createA2A({
  storage?: StorageAdapter,  // ストレージアダプター
  events?: {                 // イベント送信設定
    send: (event) => Promise<void>
  }
})
```

#### `defineExecutor(config)`

Executorを定義します。

```typescript
const executor = defineExecutor({
  extension: string,         // Extension URI
  input?: ZodSchema,         // 入力スキーマ（オプション）
  output?: ZodSchema,        // 出力スキーマ（オプション）
  execute: async (input, context) => {
    // 処理ロジック
    // outputスキーマが指定されている場合、
    // 戻り値は自動的にバリデーションされます
  }
})
```

outputスキーマを指定した場合の利点：
- 戻り値の型安全性が保証される
- 実行時に自動的にバリデーションされる
- 型推論により、IDEの補完が効く

```typescript
// outputスキーマありの例
const typedExecutor = defineExecutor({
  extension: 'https://example.com/typed/v1',
  output: z.object({
    result: z.string(),
    confidence: z.number().min(0).max(1)
  }),
  execute: async (input, context) => {
    // TypeScript: 戻り値の型が推論される
    return {
      result: 'success',
      confidence: 0.95
    }
  }
})
```

### ExecutorContext

Executorに渡されるコンテキストオブジェクト：

```typescript
interface ExecutorContext {
  message: Message           // 元のA2Aメッセージ
  taskId: string            // タスクID
  
  // ステータス更新
  updateStatus(state: TaskState, message?: string): Promise<void>
  
  // ユーザー入力要求
  // requireInput(options: {
  //   question: string
  //   schema?: any
  //   artifacts?: Artifact[]
  // }): Promise<string>       // requestIdを返す
  
  // アーティファクト保存
  updateArtifact(artifact: {
    kind: string
    name?: string
    data: any
  }): Promise<Artifact>
  
  // タスク情報取得
  getTask(): Promise<Task>
}
```

### Integration

#### `nextjsIntegration(a2a, options?)`

Next.js App Routerとの統合を提供します。

```typescript
export const { POST, GET } = nextjsIntegration(a2a, {
  sse?: false | {           // SSE設定
    path?: string           // デフォルト: '/events'
  },
  basePath?: string         // デフォルト: '/api/a2a'
})
```

## 関連リンク

- [A2A Protocol Specification](https://a2aproject.github.io/A2A/latest/)
- [A2A JSON Schema](https://github.com/google-a2a/A2A/blob/main/specification/json/a2a.json)
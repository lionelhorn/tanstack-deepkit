import { useState } from 'react'
import { typeOf, ReflectionKind } from '@deepkit/type'
import type { User } from '~/models/user'

const userType = typeOf<User>()
const fieldCount = userType.kind === ReflectionKind.objectLiteral ? (userType as any).types?.length ?? 0 : 0

export function UserCard({ user }: { user: User }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold">{user.name}</h3>
      <p className="text-sm text-gray-500">{user.email}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-500 mt-1">
        {expanded ? 'Hide' : 'Show'} type info
      </button>
      {expanded && <p className="text-xs text-gray-400 mt-1">User has {fieldCount} fields</p>}
    </div>
  )
}

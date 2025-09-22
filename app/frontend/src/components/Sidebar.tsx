import React, { useState } from 'react'
import { Menu, MoveLeft } from 'lucide-react'

interface SidebarItem { label: string; icon: React.ReactNode; onClick?: () => void }
interface SidebarProps { items: SidebarItem[]; bottomItems?: SidebarItem[] }

const Sidebar: React.FC<SidebarProps> = ({ items, bottomItems = [] }) => {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className={`fixed top-0 left-0 h-screen bg-black text-gray-200 border-r shadow-lg flex flex-col transition-all duration-300 ${expanded ? 'w-48' : 'w-16'}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        {expanded && <span className="font-bold text-lg">Menu</span>}
        <button onClick={() => setExpanded(!expanded)} className="cursor-pointer p-2 rounded-md hover:bg-gray-800">
          {expanded ? <MoveLeft size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 flex flex-col p-2 space-y-2">
        {items.map((item, idx) => (
          <button key={idx} onClick={item.onClick} className="cursor-pointer flex items-center px-3 py-2 rounded-md hover:bg-gray-800">
            <span className="shrink-0">{item.icon}</span>
            {expanded && <span className="ml-3 truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      {bottomItems.length > 0 && (
        <div className="p-2 border-t border-gray-100">
          {bottomItems.map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="cursor-pointer w-full flex items-center px-3 py-2 rounded-md hover:bg-gray-800">
              <span className="shrink-0">{item.icon}</span>
              {expanded && <span className="ml-3 truncate">{item.label}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
export default Sidebar


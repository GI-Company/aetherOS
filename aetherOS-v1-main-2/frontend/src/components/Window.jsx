import React from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import { X, Minus, Square } from 'lucide-react';
import { cn } from '../lib/utils';
import 'react-resizable/css/styles.css';


const Window = ({
  id,
  children,
  title,
  Icon,
  x,
  y,
  width,
  height,
  isMinimized,
  isMaximized,
  zIndex,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  isActive,
  bounds,
}) => {
  const [size, setSize] = React.useState({ width: width, height: height });
  
  const onResize = (event, { element, size, handle }) => {
    setSize({ width: size.width, height: size.height });
  };
  
  if (isMinimized) {
    return null;
  }

  return (
    <Draggable
      handle=".window-header"
      onStart={() => onFocus(id)}
      position={{ x, y }}
      disabled={isMaximized}
      bounds={{
        left: 0, 
        top: 0, 
        right: bounds.current ? bounds.current.offsetWidth - size.width : 0, 
        bottom: bounds.current ? bounds.current.offsetHeight - size.height : 0
      }}
    >
      <Resizable
        height={size.height}
        width={size.width}
        onResize={onResize}
        minConstraints={[300, 200]}
        maxConstraints={[1200, 800]}
        handle={isMaximized ? <div /> : undefined}
      >
        <div
          style={{ 
            zIndex, 
            width: isMaximized ? '100%' : `${size.width}px`, 
            height: isMaximized ? '100%' : `${size.height}px`,
            // When maximized, position is handled by parent, not Draggable
            transform: isMaximized ? 'translate(0, 0)' : '',
            top: isMaximized ? y : undefined,
            left: isMaximized ? x : undefined,
          }}
          className={cn(
            'absolute flex flex-col rounded-lg shadow-2xl bg-gray-800/80 backdrop-blur-xl border',
            isActive ? 'border-blue-500' : 'border-gray-600',
            isMaximized && 'rounded-none'
          )}
          onClick={() => onFocus(id)}
        >
          <div 
            className={cn("window-header h-8 flex items-center justify-between px-2 bg-gray-900/50 rounded-t-lg border-b border-gray-700", !isMaximized && "cursor-move")} 
            onDoubleClick={onMaximize}
          >
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-gray-300" />}
                <span className="text-sm text-white select-none">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-full hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); onMinimize(id); }}><Minus className="h-3 w-3 text-white" /></button>
              <button className="p-1.5 rounded-full hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); onMaximize(id); }}><Square className="h-3 w-3 text-white" /></button>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 rounded-full hover:bg-red-500"><X className="h-3 w-3 text-white" /></button>
            </div>
          </div>
          <div className="flex-grow overflow-hidden">
            {children}
          </div>
        </div>
      </Resizable>
    </Draggable>
  );
};

export default Window;

import React from 'react';
import { MessageProvider, useMessageContext } from '../contexts/MessageContext';
import { ConversationsSidebar } from '../components/messages/ConversationsSidebar';
import { ConversationWindow } from '../components/messages/ConversationWindow';
import NewMessageModal from '../components/messages/NewMessageModal';

const Inner: React.FC = () => {
  const { isNewMessageOpen, activeConversationId, selectConversation, refreshConversations } = useMessageContext();
  return (
    <>
      <div className="h-[calc(100vh-64px)] flex border rounded shadow bg-gray-50">
        <ConversationsSidebar />
        <ConversationWindow />
      </div>
      <NewMessageModal
        open={isNewMessageOpen}
        onClose={() => refreshConversations()}
        onSent={(rid) => {
          // 发送后会自动创建或获取会话，刷新列表后自动显示在侧栏；这里可选进一步逻辑
          refreshConversations();
        }}
      />
    </>
  );
};

const MessagesPage: React.FC = () => (
  <MessageProvider>
    <Inner />
  </MessageProvider>
);

export default MessagesPage;

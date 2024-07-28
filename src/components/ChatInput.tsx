import { Loader, SendHorizontal } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useChatActions } from "@/hooks/useChatActions";
import { useChats } from "@/hooks/useChats";
import { useAgent } from "@/hooks/useAgent";
import { useProjects } from "@/hooks/useProjects";
import { useProjectActions } from "@/hooks/useProjectActions";
import { useToast } from "./ui/use-toast";

interface ChatInputProps {
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChatInput = ({ loading, setLoading }: ChatInputProps) => {
    const location = useLocation();
    const chatId = location.pathname.split("/")[2];

    const { isAuthenticated } = useAuth();

    const navigate = useNavigate();
    const [message, setMessage] = useState("");
    const { toast } = useToast();
    const { refetchChatMessages /*, getChatMessages */} = useChat({
        id: chatId,
    });
    const { generateAIResponse } = useAgent();
    const { refetchChatsList } = useChats();
    const { createChat, sendMessageExistingChat } = useChatActions();
    const { projects, refetchProjectsList } = useProjects();
    const { createProject } = useProjectActions();

    const isOnProjectPage = location.pathname.split("/")[1] === "project";

    // Clear the chat inputted text when the user goes to a different page
    useEffect(() => {
        setMessage("");
    }, [location.pathname]);

    const projectExistsForChat = useMemo(() => {
        if (!projects) {
            return false;
        }

        return Boolean(
            projects.find(
                (project) => project.chat_id === chatId
            )
        );
    }, [projects, chatId]);

    async function onSendMessage() {
        setLoading(true);
        try {
            if (location.pathname === "/") {
                // If this is a new chat, send the message and navigate to the chat
                const response = await createChat(message, "user");
                console.log('if er modhe', response)
                await generateAIResponse(response.chat_id);

                await refetchChatsList();
                await refetchChatMessages();

                navigate(`/chat/${response.chat_id}`);
            } else {
                // If this is an existing chat, send the message
                setMessage("");
                console.log('mesage', message)
                const chatId = location.pathname.split("/")[2];
                console.log('else', chatId)
                await sendMessageExistingChat(message, chatId, "user");
                await refetchChatMessages();

                const aiMessage = await generateAIResponse(chatId);
                await refetchChatMessages();

                if (aiMessage.is_final) {
                    console.log("Final message received");
                    toast({
                        title: "New project requested",
                        description:
                            "Our agent is creating the new project for you. You should see it in a few seconds.",
                        variant: "success",
                    });

                    const response = await createProject(chatId);
                    await refetchProjectsList();

                    navigate(`/project/${response.project_id}`);
                }
            }
            setMessage("");
        } catch (error) {
            console.error("Failed to send message:", error);
            toast({
                title: "Failed to send message",
                description:
                    "Something went wrong while sending the message. Please try again.",
                variant: "destructive",
            });
        }
        setLoading(false);
    }

    return (
        <div className="flex items-end w-full gap-2 ">
            <Input
                placeholder={
                    !isAuthenticated
                        ? "Sign up or log in to start chatting."
                        : projectExistsForChat
                        ? "We already created a project for this chat and is now read-only."
                        : isOnProjectPage
                        ? "We will soon allow you to edit the project. In the meantime, reach out to us via email if you have any questions."
                        : "Describe the project you want to get done. E.g. 'I need a web developer for a portfolio site'."
                }
                value={message}
                className={`${
                    !isAuthenticated ? "cursor-pointer font-bold" : ""
                }`}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onSendMessage();
                    }
                }}
                onClick={
                    isAuthenticated ? undefined : () => navigate("/register")
                }
                disabled={projectExistsForChat || isOnProjectPage}
            />
            <Button
                variant="secondary"
                onClick={onSendMessage}
                disabled={
                    loading ||
                    projectExistsForChat ||
                    isOnProjectPage ||
                    !message
                }
            >
                {loading ? (
                    <Loader className="animate-spin" />
                ) : (
                    <SendHorizontal />
                )}
            </Button>
        </div>
    );
};
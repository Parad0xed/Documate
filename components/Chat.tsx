import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/layout';
import styles from './Chat.module.css';
import { Message } from '@/types/chat';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import LoadingDots from '@/components/ui/LoadingDots';
import { Document } from 'langchain/document';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger,} from '@/components/ui/accordion';
import {Button, Modal, ModalBody} from "react-bootstrap";


export function Chat() {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sourceDocs, setSourceDocs] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<{
    messages: Message[];
    pending?: string;
    history: [string, string][];
    pendingSourceDocs?: Document[];
  }>({
    messages: [
      {
        message: 'Hi. What would you like to know?',
        type: 'apiMessage',
      },
    ],
    history: [],
    pendingSourceDocs: [],
  });

  const { messages, pending, history, pendingSourceDocs } = messageState;

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  //handle form submission
  async function handleSubmit(e: any) {
    e.preventDefault();

    setError(null);

    if (!query) {
      alert('Please input a question');
      return;
    }

    const question = query.trim();

    setMessageState((state) => ({
      ...state,
      messages: [
        ...state.messages,
        {
          type: 'userMessage',
          message: question,
        },
      ],
      pending: undefined,
    }));

    setLoading(true);
    setQuery('');
    setMessageState((state) => ({ ...state, pending: '' }));

    const ctrl = new AbortController();

    try {
      fetchEventSource('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          history,
        }),
        signal: ctrl.signal,
        onmessage: (event) => {
          if (event.data === '[DONE]') {
            setMessageState((state) => ({
              history: [...state.history, [question, state.pending ?? '']],
              messages: [
                ...state.messages,
                {
                  type: 'apiMessage',
                  message: state.pending ?? '',
                  sourceDocs: state.pendingSourceDocs,
                },
              ],
              pending: undefined,
              pendingSourceDocs: undefined,
            }));
            setLoading(false);
            ctrl.abort();
          } else {
            const data = JSON.parse(event.data);
            if (data.sourceDocs) {
              setMessageState((state) => ({
                ...state,
                pendingSourceDocs: data.sourceDocs,
              }));
            } else {
              setMessageState((state) => ({
                ...state,
                pending: (state.pending ?? '') + data.data,
              }));
            }
          }
        },
      });
    } catch (error) {
      setLoading(false);
      setError('An error occurred while fetching the data. Please try again.');
      console.log('error', error);
    }
  }

  //prevent empty submissions
  const handleEnter = useCallback(
    (e: any) => {
      if (e.key === 'Enter' && query) {
        handleSubmit(e);
      } else if (e.key == 'Enter') {
        e.preventDefault();
      }
    },
    [query],
  );

  const chatMessages = useMemo(() => {
    return [
      ...messages,
      ...(pending
        ? [
            {
              type: 'apiMessage',
              message: pending,
              sourceDocs: pendingSourceDocs,
            },
          ]
        : []),
    ];
  }, [messages, pending, pendingSourceDocs]);

  //scroll to bottom of chat
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  //Modal Declarations
  const [showModal, setShowModal] = useState<boolean>(false);
  const handleModal = () => {
      setShowModal(!showModal);
  };

  return (
    <>
        <img src={"../chatIcon1.svg"} className={styles.uploadIcon} onClick={handleModal}/>
        <Modal class="modal-dialog modal-" size="xl" show={showModal} onHide={handleModal} className={styles.ModalBox}>
            <Modal.Header className={styles.ModalHeader}>
              <h1 className="text-2xl font-bold lexend tracking-tighter text-center text-4xl font -my-2">
                  :Documate Chat
              </h1>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.ChatMaster}>
                <div className="mx-auto flex flex-col gap-4">
                <main className={styles.main}>
                  <div className={styles.cloud}>
                    <div ref={messageListRef} className={styles.messagelist}>
                      {chatMessages.map((message, index) => {
                        let icon;
                        let className;
                        if (message.type === 'apiMessage') {
                          icon = (
                            <Image
                              src="/logo-short.svg"
                              alt="AI"
                              width="40"
                              height="40"
                              className={styles.boticon}
                              priority
                            />
                          );
                          className = styles.apimessage;
                        } else {
                          icon = (
                            <Image
                              src="/usericon.png"
                              alt="Me"
                              width="40"
                              height="40"
                              className={styles.usericon}
                              priority
                            />
                          );
                          // The latest message sent by the user will be animated while waiting for a response
                          className =
                            loading && index === chatMessages.length - 1
                              ? styles.usermessagewaiting
                              : styles.usermessage;
                        }
                        return (
                          <>
                            <div key={`chatMessage-${index}`} className={className}>
                              {icon}
                              <div className={styles.markdownanswer}>
                                <ReactMarkdown linkTarget="_blank">
                                  {message.message}
                                </ReactMarkdown>
                              </div>
                            </div>
                            {message.sourceDocs && (
                              <div className="p-5">
                                <Accordion
                                  type="single"
                                  collapsible
                                  className="flex-col"
                                >
                                  {message.sourceDocs.map((doc, index) => (
                                    <div key={`messageSourceDocs-${index}`}>
                                      <AccordionItem value={`item-${index}`}>
                                        <AccordionTrigger>
                                          <h3>Source {index + 1}</h3>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <ReactMarkdown linkTarget="_blank">
                                            {doc.pageContent + "Page Number: " + doc.metadata['page_number']}
                                          </ReactMarkdown>
                                          <p className="mt-2">
                                            <b>Source:</b> {doc.metadata.source}
                                          </p>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </div>
                                  ))}
                                </Accordion>
                              </div>
                            )}
                          </>
                        );
                      })}
                      {sourceDocs.length > 0 && (
                        <div className="p-5">
                          <Accordion type="single" collapsible className="flex-col">
                            {sourceDocs.map((doc, index) => (
                              <div key={`sourceDocs-${index}`}>
                                <AccordionItem value={`item-${index}`}>
                                  <AccordionTrigger>
                                    <h3>Source {index + 1}</h3>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ReactMarkdown linkTarget="_blank">
                                      {doc.pageContent}
                                    </ReactMarkdown>
                                  </AccordionContent>
                                </AccordionItem>
                              </div>
                            ))}
                          </Accordion>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.center}>
                    <div className={styles.cloudform}>
                      <form onSubmit={handleSubmit}>
                        <textarea
                          disabled={loading}
                          onKeyDown={handleEnter}
                          ref={textAreaRef}
                          autoFocus={false}
                          rows={1}
                          maxLength={512}
                          id="userInput"
                          name="userInput"
                          placeholder={
                            loading
                              ? 'Waiting for response...'
                              : 'Please provide a question'
                          }
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          className={styles.textarea}
                        />
                        <button
                          type="submit"
                          disabled={loading}
                          className={styles.generatebutton}
                        >
                          {loading ? (
                            <div className={styles.loadingwheel}>
                              <LoadingDots color="#000" />
                            </div>
                          ) : (
                            // Send icon SVG in input field
                            <svg
                              viewBox="0 0 20 20"
                              className={styles.svgicon}
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                            </svg>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                  {error && (
                    <div className="border border-red-400 rounded-md p-4">
                      <p className="text-red-500">{error}</p>
                    </div>
                  )}
                </main>
                </div>
              </div>
            </Modal.Body>
        </Modal>
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startAIDebate, getAIDebate, sendMessageToAI, endAIDebate, evaluateAIDebate } from '../api/aiDebates';

export default function AIDebatePage({ user }) {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const [debate, setDebate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [userSide, setUserSide] = useState('pro');
  const [showStartModal, setShowStartModal] = useState(!debateId);

  // Report modal state (matches DebateRoomPage features)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportedMessage, setReportedMessage] = useState(null);
  const [reportReason, setReportReason] = useState('Harassment');
  const [toastMessage, setToastMessage] = useState('');

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState('');
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  const isEnded = debate && debate.status === 'completed';

  // Reset modal based on debateId
  useEffect(() => {
    setShowStartModal(!debateId);
  }, [debateId]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load debate if debateId exists
  useEffect(() => {
    async function loadDebate() {
      if (!debateId) return;

      setLoading(true);
      setError('');

      try {
        const res = await getAIDebate(debateId);
        if (!res.ok) {
          const body = await res.text();
          console.error('[AI] Load debate failed', res.status, body);
          setError('Failed to load debate');
          return;
        }

        const data = await res.json();
        setDebate(data.debate);
        setMessages(data.debate.messages || []);
        setTopic(data.debate.topic);
        setUserSide(data.debate.userSide);
      } catch (err) {
        console.error('Error loading debate:', err);
        setError('Failed to load debate');
      } finally {
        setLoading(false);
      }
    }

    loadDebate();
  }, [debateId]);

  const handleStartDebate = async () => {
    if (!topic.trim() || !userSide) {
      setError('Please fill in all fields');
      return;
    }

    setSending(true);
    setError('');

    try {
      const res = await startAIDebate({ topic: topic.trim(), userSide });
      if (!res.ok) {
        let errMsg = 'Failed to start debate';
        try {
          const err = await res.json();
          errMsg = err.error || err.detail || err.message || errMsg;
        } catch (_) {
          const text = await res.text();
          if (text) errMsg = text;
        }
        setError(errMsg);
        return;
      }

      const data = await res.json();
      setDebate(data.debate);
      setMessages([]);
      setShowStartModal(false);
      navigate(`/ai-debate/${data.debate._id}`);
    } catch (err) {
      console.error('Error starting debate:', err);
      setError('Failed to start debate. Check the backend logs or your API key.');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !debate || sending) return;

    const userMessage = inputText.trim();
    setSending(true);
    setInputText('');
    setError('');

    // Add user message immediately
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
    ]);

    try {
      const res = await sendMessageToAI(debate._id, userMessage);
      if (!res.ok) {
        let errMsg = 'Failed to send message';
        try {
          const err = await res.json();
          errMsg = err.error || err.detail || err.message || errMsg;
        } catch (_) {
          const text = await res.text();
          if (text) errMsg = text;
        }
        setError(errMsg);
        return;
      }

      const data = await res.json();
      setMessages(data.debate.messages || []);
      setDebate(data.debate);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. See console for details.');
    } finally {
      setSending(false);
    }
  };

  const handleEndDebate = async () => {
    if (!window.confirm('Are you sure you want to end this debate?')) return;

    try {
      const res = await endAIDebate(debate._id);
      if (!res.ok) {
        setError('Failed to end debate');
        return;
      }
      setToastMessage('Debate ended successfully.');
      setTimeout(() => setToastMessage(''), 2500);
      navigate('/');
    } catch (err) {
      console.error('Error ending debate:', err);
      setError('Failed to end debate');
    }
  };

  const handleGetEvaluation = async () => {
    setIsEvaluating(true);
    setError('');
    try {
      const res = await evaluateAIDebate(debate._id);
      if (!res.ok) {
        let errMsg = 'Failed to get evaluation';
        try {
          const err = await res.json();
          errMsg = err.error || err.detail || err.message || errMsg;
        } catch (_) {
          const text = await res.text();
          if (text) errMsg = text;
        }
        setError(errMsg);
        return;
      }

      const data = await res.json();
      setEvaluation(data.result);
      setShowEvaluationModal(true);
    } catch (err) {
      console.error('Error getting evaluation:', err);
      setError('Failed to get evaluation. Check the backend logs or your API key.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCloseEvaluationModal = () => {
    setShowEvaluationModal(false);
  };

  const handleOpenReport = (msg) => {
    setReportedMessage(msg);
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    setIsReportModalOpen(false);
    setReportedMessage(null);
    setReportReason('Harassment');
    setToastMessage('Report submitted successfully.');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  if (loading && debateId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f0e6' }}>
        <div style={{ fontSize: '1.2rem', color: '#666' }}>Loading debate...</div>
      </div>
    );
  }

  if (showStartModal) {
    return (
      <div style={{
        backgroundColor: '#f5f0e6',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '90%',
          maxWidth: '600px',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.2rem',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>Start AI Debate</h2>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Create a debate with an AI opponent.</div>
            </div>
            <button
              onClick={() => navigate('/')}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#f0f0f0',
                cursor: 'pointer',
                fontSize: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s',
                color: '#999'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
            >
              ⬅
            </button>
          </div>

          <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Should AI replace human workers?"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #eee',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Your Side</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="side"
                    value="pro"
                    checked={userSide === 'pro'}
                    onChange={(e) => setUserSide(e.target.value)}
                  />
                  For (Pro)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="side"
                    value="con"
                    checked={userSide === 'con'}
                    onChange={(e) => setUserSide(e.target.value)}
                  />
                  Against (Con)
                </label>
              </div>
            </div>

            {error && <div style={{ color: 'crimson', fontSize: '0.9rem' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartDebate}
                disabled={sending}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#222',
                  color: 'white',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: sending ? 0.6 : 1
                }}
              >
                {sending ? 'Starting...' : 'Start Debate'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!debate) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f0e6' }}>
        <div style={{ fontSize: '1.2rem', color: 'crimson' }}>Debate not found</div>
      </div>
    );
  }

  const normalizedMessages = [
    { id: 'sys', role: 'system', content: 'Welcome to your AI debate! Type your first argument below.' },
    ...messages.map((msg, idx) => ({
      id: msg._id || msg.id || `${msg.role}-${idx}-${msg.timestamp || ''}`,
      role: msg.role,
      content: msg.content || msg.text || '',
      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString()
    }))
  ];

  return (
    <div style={{
      backgroundColor: '#f5f0e6',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      <div style={{
        width: '90%',
        maxWidth: '800px',
        height: '85vh',
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>

        {/* Header */}
        <div style={{
          padding: '1.2rem',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: 'white',
          zIndex: 10,
          textAlign: 'center',
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f0f0f0',
              cursor: 'pointer',
              fontSize: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
              color: '#999'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          >
            ⬅
          </button>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#333' }}>
              🤖 AI Debate: {debate.topic}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              You are: <span style={{ fontWeight: 'bold', color: userSide === 'pro' ? '#1976d2' : '#d32f2f' }}>{userSide}</span>
              <span style={{ margin: '0 8px', color: '#ddd' }}>|</span>
              AI is: <span style={{ fontWeight: 'bold', color: debate.aiSide === 'pro' ? '#1976d2' : '#d32f2f' }}>{debate.aiSide}</span>
            </div>
          </div>

          {!isEnded ? (
            <button
              onClick={handleEndDebate}
              disabled={sending}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
            >
              End Debate
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleGetEvaluation}
                disabled={isEvaluating}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: isEvaluating ? '#f0f0f0' : 'white',
                  color: '#333',
                  fontWeight: '600',
                  cursor: isEvaluating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                  opacity: isEvaluating ? 0.6 : 1
                }}
              >
                {isEvaluating ? '⏳ Getting Feedback...' : '⚖️ Get AI Feedback'}
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
              >
                Go Back
              </button>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            backgroundColor: '#fff'
          }}
        >
          {normalizedMessages.map((msg, idx) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id ?? `sys-${idx}`} style={{ textAlign: 'center', margin: '10px 0', fontSize: '0.8rem', color: '#999' }}>
                  <span style={{ backgroundColor: '#f0f0f0', padding: '4px 12px', borderRadius: '12px' }}>
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isUserMessage = msg.role === 'user';
            const sideForColor = isUserMessage ? userSide : debate.aiSide;
            const isBlueSide = sideForColor === 'pro';
            const bubbleColor = isBlueSide ? '#e3f2fd' : '#ffebee';
            const textColor = isBlueSide ? '#0d47a1' : '#b71c1c';
            const sender = isUserMessage ? 'You' : 'AI';

            return (
              <div
                key={msg.id || `${msg.role}-${idx}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUserMessage ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                    {sender}
                  </span>
                </div>

                <div
                  style={{
                    maxWidth: '70%',
                    padding: '10px 14px',
                    fontSize: '0.95rem',
                    backgroundColor: bubbleColor,
                    color: textColor,
                    borderRadius: '12px',
                    borderTopRightRadius: isUserMessage ? '2px' : '12px',
                    borderTopLeftRadius: isUserMessage ? '12px' : '2px',
                    wordWrap: 'break-word'
                  }}
                >
                  {msg.content}
                </div>

                {!isUserMessage && (
                  <div style={{ marginTop: '4px', marginLeft: '4px' }}>
                    <button
                      onClick={() => handleOpenReport(msg)}
                      title="Report Message"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0',
                        opacity: 0.5,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}
                    >
                      <span style={{ fontSize: '0.8rem' }}>🚩</span>
                      <span style={{
                        fontSize: '0.65rem',
                        color: '#888',
                        marginLeft: '4px',
                        fontWeight: 'normal'
                      }}>
                        report message
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{
            backgroundColor: '#ffe6e6',
            color: 'crimson',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '15px', borderTop: '1px solid #f0f0f0', backgroundColor: 'white' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              disabled={isEnded || sending}
              placeholder={isEnded ? 'This debate has ended. Read-only mode.' : (sending ? 'Waiting for AI response...' : 'Type your argument...')}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 15px',
                borderRadius: '20px',
                border: '1px solid #eee',
                backgroundColor: (isEnded || sending) ? '#f0f0f0' : '#f9f9f9',
                color: (isEnded || sending) ? '#999' : '#000',
                outline: 'none',
                fontSize: '0.95rem',
                cursor: (isEnded || sending) ? 'not-allowed' : 'text'
              }}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isEnded || sending}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: userSide === 'pro' ? '#1976d2' : '#d32f2f',
                color: 'white',
                cursor: (!inputText.trim() || isEnded || sending) ? 'not-allowed' : 'pointer',
                opacity: (!inputText.trim() || isEnded || sending) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ➤
            </button>
          </form>
        </div>

        {/* Report Modal */}
        {isReportModalOpen && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              backgroundColor: 'white', padding: '24px', borderRadius: '16px',
              width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', color: '#333' }}>Report Message</h3>
              <div style={{
                fontSize: '0.9rem', color: '#555', marginBottom: '20px',
                padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px',
                borderLeft: '4px solid #d32f2f', fontStyle: 'italic',
                maxHeight: '80px', overflowY: 'auto', wordBreak: 'break-word'
              }}>
                "{reportedMessage?.content || reportedMessage?.text}"
              </div>
              <form onSubmit={handleSubmitReport}>
                <label style={{ display: 'block', marginBottom: '20px', fontSize: '0.9rem', color: '#444' }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600' }}>Reason for reporting:</div>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid #ddd', outline: 'none',
                      backgroundColor: 'white', cursor: 'pointer'
                    }}
                  >
                    <option value="Harassment">Harassment / Bullying</option>
                    <option value="Spam">Spam</option>
                    <option value="Hate Speech">Hate Speech</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                  </select>
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    style={{
                      padding: '8px 16px', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', backgroundColor: '#f0f0f0',
                      color: '#333', fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', backgroundColor: '#d32f2f', color: 'white',
                      fontWeight: '600', transition: 'background-color 0.2s'
                    }}
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Evaluation Modal */}
        {showEvaluationModal && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(2px)',
            overflow: 'auto'
          }}>
            <div style={{
              backgroundColor: 'white', padding: '24px', borderRadius: '16px',
              width: '90%', maxWidth: '600px', maxHeight: '80vh',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              animation: 'fadeIn 0.2s ease-out',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>⚖️ AI Feedback</h3>
                <button
                  onClick={handleCloseEvaluationModal}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '24px', color: '#999', padding: 0
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{
                fontSize: '0.95rem', color: '#444', lineHeight: '1.6',
                whiteSpace: 'pre-wrap', wordWrap: 'break-word',
                backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px',
                maxHeight: 'calc(80vh - 100px)', overflowY: 'auto'
              }}>
                {evaluation}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={handleCloseEvaluationModal}
                  style={{
                    padding: '10px 20px', border: 'none', borderRadius: '8px',
                    backgroundColor: '#2196F3', color: 'white', fontWeight: '600',
                    cursor: 'pointer', transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1976D2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2196F3')}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {toastMessage && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#2e7d32', color: 'white', padding: '12px 24px',
            borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1001, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <span style={{ fontSize: '1.1rem' }}>✓</span> {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}

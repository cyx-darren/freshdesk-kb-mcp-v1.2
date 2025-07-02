import React, { useState, useEffect } from 'react';
import playwrightService from '../services/playwright.js';

const PlaywrightDemo = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [url, setUrl] = useState('https://example.com');
  const [activeTab, setActiveTab] = useState('screenshot');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await playwrightService.getStatus();
      setStatus(response);
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const handleScreenshot = async () => {
    setLoading(true);
    try {
      const result = await playwrightService.takeScreenshot(url, {
        fullPage: false,
        waitFor: 'networkidle'
      });
      setResults(prev => ({ ...prev, screenshot: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, screenshot: { success: false, error: error.message } }));
    }
    setLoading(false);
  };

  const handleExtractContent = async () => {
    setLoading(true);
    try {
      const result = await playwrightService.extractContent(url, 'body');
      setResults(prev => ({ ...prev, content: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, content: { success: false, error: error.message } }));
    }
    setLoading(false);
  };

  const handleSearchElements = async () => {
    setLoading(true);
    try {
      const result = await playwrightService.searchElements(url, {
        selector: 'h1, h2, h3'
      });
      setResults(prev => ({ ...prev, elements: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, elements: { success: false, error: error.message } }));
    }
    setLoading(false);
  };

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const result = await playwrightService.generatePDF(url, {
        format: 'A4'
      });
      setResults(prev => ({ ...prev, pdf: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, pdf: { success: false, error: error.message } }));
    }
    setLoading(false);
  };

  const handleMonitorNetwork = async () => {
    setLoading(true);
    try {
      const result = await playwrightService.monitorNetwork(url, 10000); // 10 seconds
      setResults(prev => ({ ...prev, network: result }));
    } catch (error) {
      setResults(prev => ({ ...prev, network: { success: false, error: error.message } }));
    }
    setLoading(false);
  };

  const handleCleanup = async () => {
    setLoading(true);
    try {
      await playwrightService.cleanup();
      checkStatus();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
    setLoading(false);
  };

  const downloadFile = (base64Data, filename, mimeType) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'screenshot', label: 'Screenshot', action: handleScreenshot },
    { id: 'content', label: 'Extract Content', action: handleExtractContent },
    { id: 'elements', label: 'Search Elements', action: handleSearchElements },
    { id: 'pdf', label: 'Generate PDF', action: handleGeneratePDF },
    { id: 'network', label: 'Monitor Network', action: handleMonitorNetwork }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h1 className="text-3xl font-bold mb-2">🎭 Playwright Browser Automation</h1>
          <p className="text-blue-100">Powerful web scraping, testing, and automation capabilities</p>
        </div>

        {/* Status */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Browser Status</h2>
              {status ? (
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    status.status?.isInitialized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {status.status?.isInitialized ? '✅ Ready' : '⏳ Not Initialized'}
                  </span>
                  <span className="text-gray-600">{status.message}</span>
                </div>
              ) : (
                <span className="text-gray-500">Loading...</span>
              )}
            </div>
            <div className="space-x-2">
              <button
                onClick={checkStatus}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Refresh Status
              </button>
              <button
                onClick={handleCleanup}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Cleanup
              </button>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div className="p-6 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Action Button */}
        <div className="p-6 border-b">
          <button
            onClick={tabs.find(tab => tab.id === activeTab)?.action}
            disabled={loading || !url}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              `Execute ${tabs.find(tab => tab.id === activeTab)?.label}`
            )}
          </button>
        </div>

        {/* Results */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          
          {activeTab === 'screenshot' && results.screenshot && (
            <div className="space-y-4">
              {results.screenshot.success ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-600 font-medium">✅ Screenshot captured</span>
                    <button
                      onClick={() => downloadFile(results.screenshot.data.screenshot, 'screenshot.png', 'image/png')}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Download
                    </button>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p><strong>Title:</strong> {results.screenshot.data.title}</p>
                    <p><strong>URL:</strong> {results.screenshot.data.url}</p>
                  </div>
                  <img
                    src={`data:image/png;base64,${results.screenshot.data.screenshot}`}
                    alt="Screenshot"
                    className="max-w-full border rounded shadow-lg"
                  />
                </div>
              ) : (
                <div className="text-red-600">❌ {results.screenshot.error}</div>
              )}
            </div>
          )}

          {activeTab === 'content' && results.content && (
            <div className="space-y-4">
              {results.content.success ? (
                <div>
                  <div className="text-green-600 font-medium mb-2">✅ Content extracted</div>
                  <div className="bg-gray-100 p-3 rounded mb-4">
                    <p><strong>Title:</strong> {results.content.data.title}</p>
                    <p><strong>URL:</strong> {results.content.data.url}</p>
                    <p><strong>Length:</strong> {results.content.data.length} characters</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{results.content.data.content}</pre>
                  </div>
                </div>
              ) : (
                <div className="text-red-600">❌ {results.content.error}</div>
              )}
            </div>
          )}

          {activeTab === 'elements' && results.elements && (
            <div className="space-y-4">
              {results.elements.success ? (
                <div>
                  <div className="text-green-600 font-medium mb-2">
                    ✅ Found {results.elements.data.count} elements
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.elements.data.elements.map((element, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded">
                        <div className="font-medium">{element.tagName}</div>
                        <div className="text-sm text-gray-600 truncate">{element.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-red-600">❌ {results.elements.error}</div>
              )}
            </div>
          )}

          {activeTab === 'pdf' && results.pdf && (
            <div className="space-y-4">
              {results.pdf.success ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-600 font-medium">✅ PDF generated</span>
                    <button
                      onClick={() => downloadFile(results.pdf.data.pdf, 'webpage.pdf', 'application/pdf')}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Download PDF
                    </button>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p><strong>Title:</strong> {results.pdf.data.title}</p>
                    <p><strong>URL:</strong> {results.pdf.data.url}</p>
                    <p><strong>Size:</strong> {(results.pdf.data.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              ) : (
                <div className="text-red-600">❌ {results.pdf.error}</div>
              )}
            </div>
          )}

          {activeTab === 'network' && results.network && (
            <div className="space-y-4">
              {results.network.success ? (
                <div>
                  <div className="text-green-600 font-medium mb-2">✅ Network monitoring completed</div>
                  <div className="bg-gray-100 p-3 rounded mb-4">
                    <p><strong>Total Requests:</strong> {results.network.data.summary.totalRequests}</p>
                    <p><strong>Total Responses:</strong> {results.network.data.summary.totalResponses}</p>
                    <p><strong>Duration:</strong> {results.network.data.summary.duration / 1000}s</p>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <h4 className="font-medium">Recent Requests:</h4>
                    {results.network.data.requests.slice(0, 10).map((request, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                        <div className="font-medium">{request.method} {request.url}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-red-600">❌ {results.network.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaywrightDemo; 
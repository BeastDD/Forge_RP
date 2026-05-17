            {/* Model Type + Checkpoint */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-mandingo-muted mb-2">MODEL TYPE</div>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value as 'sd15' | 'sdxl')}
                  className="w-full bg-mandingo-surface2 border border-mandingo-gold/20 rounded-2xl p-3"
                >
                  <option value="sdxl">SDXL (Illustrious, Pony, etc.)</option>
                  <option value="sd15">SD 1.5</option>
                </select>
              </div>

              <div>
                <div className="text-sm text-mandingo-muted mb-2">CHECKPOINT</div>
                <select
                  value={selectedCheckpoint}
                  onChange={(e) => setSelectedCheckpoint(e.target.value)}
                  className="w-full bg-mandingo-surface2 border border-mandingo-gold/20 rounded-2xl p-3"
                >
                  {checkpoints.length === 0 && <option>No models found</option>}
                  {checkpoints.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>

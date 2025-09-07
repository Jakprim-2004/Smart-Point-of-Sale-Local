import React, { useEffect } from 'react';

function Modal({ show, onHide, title, children, modalSize = '' }) {
    useEffect(() => {
        if (show) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }

        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [show]);

    if (!show) return null;

    return (
        <>
            <div 
                className="modal fade show" 
                tabIndex="-1"
                style={{ 
                    display: 'block',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onHide();
                    }
                }}
                data-bs-backdrop="static"
                data-bs-keyboard="false"
            >
                <div className={`modal-dialog ${modalSize} modal-dialog-scrollable modal-dialog-centered`}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button 
                                type="button" 
                                className="btn-close" 
                                onClick={onHide}
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="modal-body">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    );
}

export default Modal;
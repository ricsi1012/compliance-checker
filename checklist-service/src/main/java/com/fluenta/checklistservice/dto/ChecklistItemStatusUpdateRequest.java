package com.fluenta.checklistservice.dto;

import com.fluenta.checklistservice.model.ChecklistItemStatus;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class ChecklistItemStatusUpdateRequest {

    @NotNull
    private ChecklistItemStatus status;

    private List<String> evidence;

    public ChecklistItemStatus getStatus() {
        return status;
    }

    public void setStatus(ChecklistItemStatus status) {
        this.status = status;
    }

    public List<String> getEvidence() {
        return evidence;
    }

    public void setEvidence(List<String> evidence) {
        this.evidence = evidence;
    }
}

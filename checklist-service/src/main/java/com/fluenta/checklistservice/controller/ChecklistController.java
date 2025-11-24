package com.fluenta.checklistservice.controller;

import com.fluenta.checklistservice.dto.ChecklistItemStatusUpdateRequest;
import com.fluenta.checklistservice.dto.ChecklistProgressResponse;
import com.fluenta.checklistservice.model.Checklist;
import com.fluenta.checklistservice.model.ChecklistItem;
import com.fluenta.checklistservice.service.ChecklistService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/checklists", "/api/checklists"})
@CrossOrigin(origins = "http://localhost:5173")
public class ChecklistController {

    private final ChecklistService checklistService;

    public ChecklistController(ChecklistService checklistService) {
        this.checklistService = checklistService;
    }

    @GetMapping
    public List<Checklist> getAll() {
        return checklistService.getAllChecklists();
    }

    @GetMapping("/{id}")
    public Checklist getById(@PathVariable Long id) {
        return checklistService.getChecklist(id);
    }

    @RequestMapping(value = "/{id}/items/{itemId}/status", method = {RequestMethod.POST, RequestMethod.PUT})
    public ChecklistItem updateStatus(@PathVariable Long id,
                                      @PathVariable Long itemId,
                                      @Valid @RequestBody ChecklistItemStatusUpdateRequest request) {
        return checklistService.updateItemStatus(id, itemId, request.getStatus(), request.getEvidence());
    }

    @GetMapping("/{id}/progress")
    public ChecklistProgressResponse getProgress(@PathVariable Long id) {
        return checklistService.getProgress(id);
    }
}
